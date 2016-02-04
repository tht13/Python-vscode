"use strict";
import { RemoteConsole, Diagnostic, DiagnosticSeverity, Range } from 'vscode-languageserver';
import { BaseLinter, MatchProperties } from './baseLinter';

export class PyLinter extends BaseLinter {
    constructor(args?: string[]) {
        args = args || [];
        let target = "pylint";
        let pylintArgs = ["-r", "n"];
        super(target, args.concat(pylintArgs));
        this.setRegExp("(\\w):([\\s\\d]{3,}),([\\s\\d]{2,}): (.+?) \\((.*)\\)");
        this.buildSeverityMap();
    }

    fixResults(results: string[]): string[] {
        // remove lines up to first error message
        for (let i = 0; !results[i++].startsWith('***'); results.shift());
        results.shift();
        return results;
    }

    /**
     * Diagnostic Severity Map
     */
    protected buildSeverityMap() {
        super.buildSeverityMap();
        this._severityMap.set('E', DiagnosticSeverity.Error);
        this._severityMap.set('F', DiagnosticSeverity.Error);
        this._severityMap.set('W', DiagnosticSeverity.Warning);
        this._severityMap.set('C', DiagnosticSeverity.Information);
        this._severityMap.set('R', DiagnosticSeverity.Information);
    }

    parseLintResult(lint: string): Diagnostic {
        let diagnostic: Diagnostic;
        
        //TODO: vscode node does not yet support destructuring
        // Find out if typescript can specify es5 parts and es6 parts for compile
        // Here and other places
        
        let matchProperties: MatchProperties;
        // destructuring not yet supported in vscode
        // must be done manually
        {
            //TODO: parse null better
            let match = lint.match(this.getRegExp());
            if (match == null) {
                this.warn("unparsed line:");
                this.warn(lint);
                return;
            }
            matchProperties = {
                completeMatch: match[0],
                severityKey: match[1],
                line: parseInt(match[2]) - 1,
                column: parseInt(match[3]),
                message: match[4],
                object: match[5]
            };
        }


        let severity = this._severityMap.has(matchProperties.severityKey)
            ? this._severityMap.get(matchProperties.severityKey)
            : DiagnosticSeverity.Error;

        let quote: string = null;
        //TODO: try to implement this better
        // check for variable name or line in message
        if (matchProperties.message.indexOf('"') !== -1) {
            quote = matchProperties.message.match(/\\?"(.*?)\\?"/)[1];
        } else if (matchProperties.message.indexOf("'") !== -1) {
            quote = matchProperties.message.match(/'(.*)'/)[1];
        }
            
        // implement multiLine messages
        // ie lineStart and lineEnd
        let lineNumber = matchProperties.line;
        let colStart = matchProperties.column;
        let colEnd = this._documentText[lineNumber].length;
        let documentLine: string = this._documentText[lineNumber];
        if (quote !== null) {
            let quoteRe: RegExp = new RegExp("\\W" + quote + "\\W");
            let quoteStart: number = documentLine.search(quoteRe) + 1;
            if (quoteStart === -1) {
                this.warn("Colstart could not be identified.");
            } else {
                colStart = quoteStart;
                colEnd = colStart + quote.length;
            }
        }
        // make sure colStart does not including leading whitespace
        if (colStart == 0 && documentLine.substr(0, 1).match(/\s/) !== null) {
            colStart = documentLine.length - documentLine.replace(/^\s*/g, "").length;
        }
        this.log(`${JSON.stringify(matchProperties.completeMatch)}`);

        diagnostic = {
            severity: severity,
            range: this.createRange(lineNumber, colStart, lineNumber, colEnd),
            message: matchProperties.message + ': ' + matchProperties.object
        };

        return diagnostic;
    }
}