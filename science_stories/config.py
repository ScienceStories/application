#!/usr/bin/python
# coding=UTF-8
# Copyright (C) 2018
# All rights reserved.
#
# This code is distributed under the terms of the GNU General Public
# License, Version 3. See the text file "COPYING" for further details
# about the terms of this license.
#
"""Configuration for Science Stories Flask app."""
import os

# Template these values for flexible install
HOST = 'localhost'
LOG_ROOT = '/tmp/'

class BaseConfig(object):
    """Base / default config, no debug logging and short log format."""
    HOST = HOST
    DEBUG = False
    LOG_FORMAT = '[%(filename)-15s:%(lineno)-5d] %(message)s'
    LOG_FILE = LOG_ROOT + 'science_stories.log'
    SECRET_KEY = '7d441f27d441f27567d441f2b6176a'
    WIKIDATA_USER_NAME = 'username'
    WIKIDATA_PASSWORD = 'password'

class DevConfig(BaseConfig):
    """Developer level config, with debug logging and long log format."""
    DEBUG = True
    LOG_FORMAT = '[%(asctime)s %(levelname)-8s %(filename)-15s:%(lineno)-5d %(funcName)-30s] %(message)s'

CONFIGS = {
    "dev": 'science_stories.config.DevConfig',
    "default": 'science_stories.config.BaseConfig'
}

def configure_app(app):
    """Grabs the environment variable for app config or defaults to dev."""
    config_name = os.getenv('WIKIDP_CONFIG', 'dev')
    app.config.from_object(CONFIGS[config_name])
    app.config.WIKIDATA_USER_NAME = os.getenv('WIKIDP_BOT_USER', BaseConfig.WIKIDATA_USER_NAME)
    app.config.WIKIDATA_PASSWORD = os.getenv('WIKIDP_BOT_PASSWORD', BaseConfig.WIKIDATA_PASSWORD)
