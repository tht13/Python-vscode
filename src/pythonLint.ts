'use strict';

import vscode = require('vscode');
import cp = require('child_process');
import path = require('path');



            // Spawn `gocode` process
			var p = cp.execFile("pylin", [".", "-f=msvc", "-j8", "-r", "n"], {}, (err, stdout, stderr) => {
				try {
					if (err && (<any>err).code == "ENOENT") {
						vscode.window.showInformationMessage("The 'gocode' command is not available.  Use 'go get -u github.com/nsf/gocode' to install.");
					}
					if (err) return reject(err);
					var results = stdout.toString().split('\n';
					// var suggestions = results[1].map(suggest => {
					// 	var item = new vscode.CompletionItem(suggest.name);
                    //     item.kind = vscodeKindFromGoCodeClass(suggest.class);
                    //     item.detail = suggest.type;
					// 	return item;
					// });
					// resolve(suggestions);
				} catch (e) {
					// reject(e);
				}
			});
			p.stdin.end(document.getText());