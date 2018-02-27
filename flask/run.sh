#!/usr/bin/env bash
source ./venv/bin/activate
export WIKIDP_BOT_USER='<username>'
export WIKIDP_BOT_PASSWORD='<password>'
export FLASK_APP='science_stories'
export FLASK_DEBUG=0
flask run
