# Python-vscode

![Build Status](https://travis-ci.org/tht13/Python-vscode.svg "Build Status")

A Python language pack for Visual Studio Code

Supports syntax highlighting, snippets and linting (see requirements below).
Linting can be customised with a `.pylintrc` file in the root of the current working directory 

## Requirements
* Python (2 or 3)
  * To instruct on Python 2 or 3 the shebang must be present at the top of the python file  
    `!#/usr/bin/python2` or `!#/usr/bin/python3`  
    Not specifying 2 or 3 will default to 2.
* Pylint (pip install pylint)

## TODO

* [ ] Gulp tasks
* [ ] Tests
* [x] Travis
  * [ ] save npm log on build fail
* [ ] Debugging
* [x] Linting
  * [x] Lint on save of file
  * [x] Modularised to allow choice of linters
* [ ] Intellisense
* [ ] Formatting
* [x] Snippets
* [x] Syntax Highlighting
