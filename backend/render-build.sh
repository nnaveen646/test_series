#!/usr/bin/env bash
set -e
# install dependencies
pip install -r requirements.txt
# run migrations
alembic upgrade head
# seed data
python seed.py
