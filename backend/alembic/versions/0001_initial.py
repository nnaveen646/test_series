"""initial migration

Revision ID: 0001_initial
Revises: 
Create Date: 2026-03-29
"""
from alembic import op
import sqlalchemy as sa

revision = '0001_initial'
down_revision = None
branch_labels = None
deepdown = None


def upgrade():
    op.create_table(
        'user',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('phone', sa.String(), nullable=False, unique=True),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('examInterest', sa.String(), nullable=False),
        sa.Column('city', sa.String(), nullable=True),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('createdAt', sa.DateTime(), nullable=False),
    )
    op.create_table(
        'test',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('testName', sa.String(), nullable=False),
        sa.Column('exam', sa.String(), nullable=False),
        sa.Column('durationMin', sa.Integer(), nullable=False),
        sa.Column('difficulty', sa.String(), nullable=False),
        sa.Column('topics', sa.String(), nullable=True),
        sa.Column('questionCount', sa.Integer(), nullable=False),
        sa.Column('createdAt', sa.DateTime(), nullable=False),
        sa.Column('updatedAt', sa.DateTime(), nullable=False),
    )
    op.create_table(
        'question',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('testId', sa.Integer(), sa.ForeignKey('test.id'), nullable=False),
        sa.Column('questionText', sa.String(), nullable=False),
        sa.Column('optionA', sa.String(), nullable=False),
        sa.Column('optionB', sa.String(), nullable=False),
        sa.Column('optionC', sa.String(), nullable=False),
        sa.Column('optionD', sa.String(), nullable=False),
        sa.Column('correctOption', sa.String(), nullable=False),
    )
    op.create_table(
        'attempt',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('userId', sa.Integer(), sa.ForeignKey('user.id'), nullable=False),
        sa.Column('testId', sa.Integer(), sa.ForeignKey('test.id'), nullable=False),
        sa.Column('startedAt', sa.DateTime(), nullable=False),
        sa.Column('submittedAt', sa.DateTime(), nullable=False),
        sa.Column('timeSpentSec', sa.Integer(), nullable=False),
        sa.Column('answers', sa.JSON(), nullable=False),
        sa.Column('correctCount', sa.Integer(), nullable=False),
        sa.Column('wrongCount', sa.Integer(), nullable=False),
        sa.Column('unattemptedCount', sa.Integer(), nullable=False),
        sa.Column('percentage', sa.Float(), nullable=False),
    )


def downgrade():
    op.drop_table('attempt')
    op.drop_table('question')
    op.drop_table('test')
    op.drop_table('user')
