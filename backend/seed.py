from datetime import datetime
from sqlmodel import Session
from app.main import engine, User, Test, Question, hash_password, select

sample_tests = [
    {
        'testName': 'UPSC General Studies Mock 1',
        'exam': 'UPSC',
        'durationMin': 20,
        'difficulty': 'Medium',
        'topics': 'Polity, History, Economy',
    },
    {
        'testName': 'SSC Reasoning Mini Test',
        'exam': 'SSC',
        'durationMin': 15,
        'difficulty': 'Easy',
        'topics': 'Reasoning, Quant',
    },
    {
        'testName': 'Banking Aptitude Drill',
        'exam': 'Banking',
        'durationMin': 20,
        'difficulty': 'Hard',
        'topics': 'Aptitude, English',
    },
    {
        'testName': 'UPSC Current Affairs',
        'exam': 'UPSC',
        'durationMin': 25,
        'difficulty': 'Medium',
        'topics': 'Current Affairs, Polity',
    },
    {
        'testName': 'SSC General Awareness',
        'exam': 'SSC',
        'durationMin': 18,
        'difficulty': 'Medium',
        'topics': 'History, Geography',
    },
    {
        'testName': 'Banking English Skill',
        'exam': 'Banking',
        'durationMin': 15,
        'difficulty': 'Easy',
        'topics': 'English',
    },
]


def seed_data():
    from app.main import create_db_and_tables

    create_db_and_tables()

    with Session(engine) as session:
        # create admin if missing
        admin = session.exec(select(User).where(User.phone == '9999999999')).one_or_none()
        if not admin:
            session.add(User(name='Admin', phone='9999999999', email='admin@example.com', examInterest='All', city='Mumbai', role='admin', password_hash=hash_password('admin123')))

        for s in sample_tests:
            existing = session.exec(select(Test).where(Test.testName == s['testName'])).one_or_none()
            if existing:
                continue
            test = Test(**s, questionCount=10, createdAt=datetime.utcnow(), updatedAt=datetime.utcnow())
            session.add(test)
            session.commit()
            session.refresh(test)
            for i in range(1, 11):
                correct = ['A', 'B', 'C', 'D'][i % 4]
                q = Question(
                    testId=test.id,
                    questionText=f"{s['testName']} Q{i}: What is placeholder?",
                    optionA='Answer A',
                    optionB='Answer B',
                    optionC='Answer C',
                    optionD='Answer D',
                    correctOption=correct,
                )
                session.add(q)
        session.commit()


if __name__ == '__main__':
    seed_data()
    print('Seed completed.')
