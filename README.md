# Python-vscode

![Build Status](https://travis-ci.org/tht13/Python-vscode.svg "Build Status")

A Python language pack for Visual Studio Code

Supports syntax highlighting, snippets and linting (see requirements below).
Linting can be customised with a `.pylintrc`(pyLint) or `setup.cfg`(flake8) file in the root of the current working directory 

## Requirements
* Python (2 or 3)
  * To instruct on Python 2 or 3 the shebang must be present at the top of the python file  
    `!#/usr/bin/python2` or `!#/usr/bin/python3`  
    Not specifying 2 or 3 will default to 2.
* One of these two linters
  * Pylint
  * Flake8

## Configuration

* `python.maxNumberOfProblems`
  * Specify the maximum number of reported problems from the linter, default: 100.
* `python.linter`
  * Specify the linter to use, `pyLint` or `flake8`
  * If you wish to see other options please add an Issue on GitHub.


## Change log

### v0.2.3
* Bug fixes and stability improvements

### v0.2.2
* Fixed "crazy" auto indentation bug

### v0.2.0
* Added compatability for different linters
* Added auto indenting inside if/else/for statements

### v0.1.2
* Lint on save of file
* Bug fixes

### v0.1.1
* Initial release

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
