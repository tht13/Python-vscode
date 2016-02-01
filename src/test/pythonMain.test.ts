// 
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//
"use strict";
// The module 'assert' provides assertion methods from node
import * as assert from 'assert';
import * as path from 'path';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as pythonMain from '../client/src/pythonMain';
let extenstionRoot = path.join(__dirname, '..', '..');
// Defines a Mocha test suite to group tests of similar kind together
suite("Python for VSCode Tests", () => {
    // Defines a Mocha unit test
    test("Python for VSCode", (done) => {
        let testPython = new pythonMain.PythonExtension();
        testPython.setExtenstionRoot(extenstionRoot);
        testPython.startServer();

        let pythonTestFile = path.join(extenstionRoot, 'src', 'test', 'python', 'test_1.py');

        vscode.workspace.openTextDocument(pythonTestFile).then((document) => {
            try {
                assert.equal(testPython.testDoc(document), 254);
                done();
            } catch (e) {
                done(e);
            }
        }, (error) => {
            assert.fail(error);
            done();
        });
    });
});