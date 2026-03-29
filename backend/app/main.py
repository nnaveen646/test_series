import os
from datetime import datetime, timedelta
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from jose import JWTError, jwt
from sqlalchemy import Column, JSON
from sqlmodel import Field, Relationship, SQLModel, Session, create_engine, select
from passlib.context import CryptContext

load_dotenv()  # loads .env in backend folder if present

DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./test_series.db')
if DATABASE_URL.startswith('postgresql://'):
    DATABASE_URL = DATABASE_URL.replace('postgresql://', 'postgresql+psycopg2://', 1)
SECRET_KEY = os.getenv('SECRET_KEY', 'supersecretkey')
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', '60'))

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

engine = create_engine(DATABASE_URL, echo=False)

app = FastAPI(title='ExamPrep Test Series API')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

class UserBase(SQLModel):
    name: str
    phone: str
    email: Optional[EmailStr] = None
    examInterest: str
    city: Optional[str] = None
    role: str = 'student'

class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    password_hash: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    attempts: List['Attempt'] = Relationship(back_populates='user')

class Test(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    testName: str
    exam: str
    durationMin: int
    difficulty: str
    topics: Optional[str] = Field(default='')
    questionCount: int
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)
    questions: List['Question'] = Relationship(back_populates='test')

class Question(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    testId: int = Field(foreign_key='test.id')
    questionText: str
    optionA: str
    optionB: str
    optionC: str
    optionD: str
    correctOption: str
    test: Optional[Test] = Relationship(back_populates='questions')

class Attempt(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    userId: int = Field(foreign_key='user.id')
    testId: int = Field(foreign_key='test.id')
    startedAt: datetime = Field(default_factory=datetime.utcnow)
    submittedAt: datetime = Field(default_factory=datetime.utcnow)
    timeSpentSec: int
    answers: Optional[list] = Field(default=None, sa_column=Column(JSON))
    correctCount: int
    wrongCount: int
    unattemptedCount: int
    percentage: float
    user: Optional[User] = Relationship(back_populates='attempts')

class RegisterRequest(BaseModel):
    name: str
    phone: str
    email: Optional[EmailStr] = None
    examInterest: str
    city: Optional[str] = None
    password: str
    confirmPassword: str
    agreeTerms: bool

class LoginRequest(BaseModel):
    phone: str
    password: str

class OTPRequest(BaseModel):
    phone: str

class OTPVerifyRequest(BaseModel):
    phone: str
    otp: str

class ResetPasswordRequest(BaseModel):
    phone: str
    otp: str
    newPassword: str
    confirmPassword: str

class TestRunRequest(BaseModel):
    userId: int
    testId: int
    answers: List[dict]
    timeSpentSec: int

class EditTestRequest(BaseModel):
    testName: str
    exam: str
    durationMin: int
    difficulty: str
    topics: List[str]

class NewQuestion(BaseModel):
    id: Optional[int]
    questionText: str
    optionA: str
    optionB: str
    optionC: str
    optionD: str
    correctOption: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[int] = None
    role: Optional[str] = None

class TestEditWithQuestions(EditTestRequest):
    questions: List[NewQuestion]

otp_store = {}

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({'exp': expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl='auth/token')

async def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)) -> User:
    credentials_exception = HTTPException(
        status_code=401,
        detail='Could not validate credentials',
        headers={'WWW-Authenticate': 'Bearer'},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get('user_id')
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(user_id=user_id, role=payload.get('role'))
    except JWTError:
        raise credentials_exception
    user = session.get(User, token_data.user_id)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    return current_user

async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail='Admin privileges required.')
    return current_user

@app.on_event('startup')
def on_startup():
    create_db_and_tables()
    with Session(engine) as session:
        admin = session.exec(select(User).where(User.phone == '9999999999')).one_or_none()
        if not admin:
            user = User(
                name='Admin',
                phone='9999999999',
                email='admin@example.com',
                examInterest='All',
                city='Mumbai',
                role='admin',
                password_hash=hash_password('admin123'),
            )
            session.add(user)
            session.commit()

@app.post('/auth/register')
def register(data: RegisterRequest, session: Session = Depends(get_session)):
    if not data.agreeTerms:
        raise HTTPException(status_code=400, detail='Terms agreement required')
    if data.password != data.confirmPassword:
        raise HTTPException(status_code=400, detail='Passwords do not match')
    exists = session.exec(select(User).where(User.phone == data.phone)).first()
    if exists:
        raise HTTPException(status_code=400, detail='Phone already registered')
    user = User(
        name=data.name,
        phone=data.phone,
        email=data.email,
        examInterest=data.examInterest,
        city=data.city,
        role='student',
        password_hash=hash_password(data.password),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return {'message': 'Registration successful', 'userId': user.id}

@app.post('/auth/token', response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    # form_data.username is phone intentionally
    user = session.exec(select(User).where(User.phone == form_data.username)).one_or_none()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail='Incorrect username or password', headers={'WWW-Authenticate': 'Bearer'})
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={'user_id': user.id, 'role': user.role}, expires_delta=access_token_expires
    )
    return {'access_token': access_token, 'token_type': 'bearer'}

@app.post('/auth/login')
def login(data: LoginRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.phone == data.phone)).one_or_none()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail='Invalid phone or password')
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={'user_id': user.id, 'role': user.role}, expires_delta=access_token_expires
    )
    return {'message': 'Login success', 'user': user, 'access_token': access_token}

@app.post('/auth/otp/send')
def send_otp(data: OTPRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.phone == data.phone)).one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail='Phone not registered')
    otp = '%06d' % (datetime.utcnow().microsecond % 1000000)
    otp_store[data.phone] = {'otp': otp, 'expiry': datetime.utcnow() + timedelta(minutes=5)}
    return {'message': 'OTP sent', 'otp': otp}

@app.post('/auth/otp/verify')
def verify_otp(data: OTPVerifyRequest, session: Session = Depends(get_session)):
    rec = otp_store.get(data.phone)
    if not rec or rec['expiry'] < datetime.utcnow() or rec['otp'] != data.otp:
        raise HTTPException(status_code=401, detail='Invalid or expired OTP')
    user = session.exec(select(User).where(User.phone == data.phone)).one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    access_token = create_access_token(data={'user_id': user.id, 'role': user.role})
    return {'message': 'OTP verified', 'user': user, 'access_token': access_token}

@app.post('/auth/reset-password')
def reset_password(data: ResetPasswordRequest, session: Session = Depends(get_session)):
    rec = otp_store.get(data.phone)
    if not rec or rec['expiry'] < datetime.utcnow() or rec['otp'] != data.otp:
        raise HTTPException(status_code=401, detail='Invalid or expired OTP')
    if data.newPassword != data.confirmPassword:
        raise HTTPException(status_code=400, detail='Passwords do not match')
    user = session.exec(select(User).where(User.phone == data.phone)).one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    user.password_hash = hash_password(data.newPassword)
    session.add(user)
    session.commit()
    return {'message': 'Password updated successfully'}

@app.get('/users/by-phone')
def get_user_by_phone(phone: str, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.phone == phone)).one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    return {'user': user}

@app.get('/users/me')
def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@app.get('/tests')
def list_tests(session: Session = Depends(get_session)):
    tests = session.exec(select(Test).order_by(Test.createdAt.desc())).all()
    return {'tests': tests}

@app.get('/tests/{test_id}')
def get_test(test_id: int, session: Session = Depends(get_session)):
    test = session.get(Test, test_id)
    if not test:
        raise HTTPException(status_code=404, detail='Test not found')
    test.questions = session.exec(select(Question).where(Question.testId == test_id)).all()
    return {'test': test, 'questions': test.questions}

@app.post('/attempts')
def submit_attempt(data: TestRunRequest, session: Session = Depends(get_session), current_user: User = Depends(get_current_active_user)):
    if current_user.id != data.userId and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail='Unauthorized to submit for this user')
    user = session.get(User, data.userId)
    test = session.get(Test, data.testId)
    if not user or not test:
        raise HTTPException(status_code=404, detail='User/Test not found')

    correct = 0
    unattempted = 0
    questions = session.exec(select(Question).where(Question.testId == data.testId)).all()
    question_map = {q.id: q for q in questions}
    total = len(questions)
    for ans in data.answers:
        q = question_map.get(ans['questionId'])
        if not q:
            continue
        sel = ans.get('selectedOption')
        if not sel:
            unattempted += 1
        elif sel == q.correctOption:
            correct += 1
    wrong = total - correct - unattempted
    percentage = round((correct / total) * 100, 2) if total else 0

    attempt = Attempt(
        userId=data.userId,
        testId=data.testId,
        timeSpentSec=data.timeSpentSec,
        answers=data.answers,
        correctCount=correct,
        wrongCount=wrong,
        unattemptedCount=unattempted,
        percentage=percentage,
    )
    session.add(attempt)
    session.commit()
    session.refresh(attempt)
    return {'message': 'Test submitted', 'attempt': attempt}

@app.get('/attempts/user/{user_id}')
def list_user_attempts(user_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_active_user)):
    if current_user.id != user_id and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail='Unauthorized')
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    attempts = session.exec(select(Attempt).where(Attempt.userId == user_id).order_by(Attempt.submittedAt.desc())).all()
    return {'attempts': attempts}

@app.get('/attempts/{attempt_id}')
def get_attempt(attempt_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_active_user)):
    attempt = session.get(Attempt, attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail='Attempt not found')
    if attempt.userId != current_user.id and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail='Unauthorized')
    return {'attempt': attempt}
    if not attempt:
        raise HTTPException(status_code=404, detail='Attempt not found')
    return {'attempt': attempt}

@app.get('/user/{user_id}/stats')
def get_user_stats(user_id: int, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    attempts = session.exec(select(Attempt).where(Attempt.userId == user_id)).all()
    if not attempts:
        return {
            'totalTests': 0,
            'totalTimeMin': 0,
            'averageScore': 0,
            'bestScore': 0,
            'lastTestAt': None,
        }
    total = len(attempts)
    tot_time = sum(a.timeSpentSec for a in attempts) / 60
    avg = round(sum(a.percentage for a in attempts) / total, 2)
    best = max(a.percentage for a in attempts)
    last = max(a.submittedAt for a in attempts)
    return {
        'totalTests': total,
        'totalTimeMin': round(tot_time, 1),
        'averageScore': avg,
        'bestScore': best,
        'lastTestAt': last.isoformat(),
    }

@app.post('/admin/upload-tests')
def upload_tests(file: UploadFile = File(...), session: Session = Depends(get_session), current_user: User = Depends(get_current_admin)):
    text = file.file.read().decode('utf-8')
    import csv
    import io

    reader = csv.DictReader(io.StringIO(text))
    required = {'testName', 'exam', 'durationMin', 'difficulty', 'topics', 'questionId', 'questionText', 'optionA', 'optionB', 'optionC', 'optionD', 'correctOption'}
    if not required.issubset(set(reader.fieldnames or [])):
        raise HTTPException(status_code=400, detail='CSV missing required columns')

    grouped = {}
    for row in reader:
        key = (row['testName'].strip(), row['exam'].strip())
        if key not in grouped:
            grouped[key] = {
                'meta': {
                    'durationMin': int(row['durationMin']),
                    'difficulty': row['difficulty'].strip(),
                    'topics': ', '.join([x.strip() for x in row['topics'].split(',') if x.strip()]),
                },
                'rows': [],
            }
        grouped[key]['rows'].append(row)

    created = 0
    for (testName, exam), data in grouped.items():
        test = Test(
            testName=testName,
            exam=exam,
            durationMin=data['meta']['durationMin'],
            difficulty=data['meta']['difficulty'],
            topics=data['meta']['topics'],
            questionCount=len(data['rows']),
        )
        session.add(test)
        session.commit()
        session.refresh(test)
        for row in data['rows']:
            question = Question(
                testId=test.id,
                questionText=row['questionText'].strip(),
                optionA=row['optionA'].strip(),
                optionB=row['optionB'].strip(),
                optionC=row['optionC'].strip(),
                optionD=row['optionD'].strip(),
                correctOption=row['correctOption'].strip().upper(),
            )
            session.add(question)
        session.commit()
        created += 1
    return {'message': 'Upload successful', 'createdTests': created}

@app.get('/admin/tests')
def list_admin_tests(session: Session = Depends(get_session), current_user: User = Depends(get_current_admin)):
    tests = session.exec(select(Test).order_by(Test.updatedAt.desc())).all()
    return {'tests': tests}

@app.delete('/admin/tests/{test_id}')
def delete_test(test_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_admin)):
    test = session.get(Test, test_id)
    if not test:
        raise HTTPException(status_code=404, detail='Test not found')
    session.delete(test)
    session.exec(select(Question).where(Question.testId == test_id)).all()
    session.commit()
    return {'message': 'Test deleted'}

@app.put('/admin/tests/{test_id}')
def edit_test(test_id: int, payload: TestEditWithQuestions, session: Session = Depends(get_session), current_user: User = Depends(get_current_admin)):
    test = session.get(Test, test_id)
    if not test:
        raise HTTPException(status_code=404, detail='Test not found')
    test.testName = payload.testName
    test.exam = payload.exam
    test.durationMin = payload.durationMin
    test.difficulty = payload.difficulty
    test.topics = payload.topics
    test.questionCount = len(payload.questions)
    test.updatedAt = datetime.utcnow()
    for q in session.exec(select(Question).where(Question.testId == test_id)).all():
        session.delete(q)
    session.commit()
    for q in payload.questions:
        question = Question(
            testId=test_id,
            questionText=q.questionText,
            optionA=q.optionA,
            optionB=q.optionB,
            optionC=q.optionC,
            optionD=q.optionD,
            correctOption=q.correctOption,
        )
        session.add(question)
    session.commit()
    session.refresh(test)
    return {'message': 'Test updated', 'test': test}
