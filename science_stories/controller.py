#!/usr/bin/python
# coding=UTF-8
#
# Science Stories - Kenneth Seals-Nutt
# Copyright (C) 2018
# All rights reserved.
#
# This code is distributed under the terms of the GNU General Public
# License, Version 3. See the text file "COPYING" for further details
# about the terms of this license.
#
""" Flask application routes for Wikidata portal. """
import logging
from flask import render_template, request, json
from science_stories import APP
import re

@APP.route("/")
def welcome():
    """Landing Page for first time"""
    return render_template('Science Stories Homepage')

if __name__ == "__main__":
    APP.run()
