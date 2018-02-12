#!/usr/bin/python
# coding=UTF-8
#
# Copyright (C) 2018
# All rights reserved.
#
# This code is distributed under the terms of the GNU General Public
# License, Version 3. See the text file "COPYING" for further details
# about the terms of this license.
#
"""Setup for flask app."""
from setuptools import setup

setup(
    name='science_stories',
    packages=['science_stories'],
    include_package_data=True,
    install_requires=[
        'flask==0.12.2',
        'wikidataintegrator==0.0.481',
        'lxml==3.7.3',
        'pywikibot==3.0.20180204'
    ],
)

#TO DO: If using python3.6, I had to run 'install certificates.command' inside the directory in order to load url's
