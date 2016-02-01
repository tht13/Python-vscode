import { RemoteConsole, Diagnostic, DiagnosticSeverity, Range } from 'vscode-languageserver';
import { BaseLinter } from './baseLinter';

//TODO: expose target to specify path to pylint
export class PyLinter extends BaseLinter {
    constructor(args: string[] = []) {
        let target = "pylint";
        let pylintArgs = ["-r", "n"];
        super(target, args.concat(pylintArgs));
        this.setRegex("(\w):([\s\d]{3,}),([\s\d]{2,}): (.+?) \((.*)\)");
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
        let [completeMatch,
            severityKey,
            line,
            column,
            message,
            object] = lint.match(/(\w):([\s\d]{3,}),([\s\d]{2,}): (.+?) \((.*)\)/);

        if (completeMatch == null) {
            this.warn("unparsed line:");
            this.warn(lint);
            return;
        }

        let severity = this._severityMap.has(severityKey) ? this._severityMap.get(severityKey) : DiagnosticSeverity.Error;

        let quote: string = null;
        // check for variable name or line in message
        if (message.indexOf('"') !== -1) {
            quote = message.match(/\\?"(.*?)\\?"/)[1];
        } else if (message.indexOf("'") !== -1) {
            quote = message.match(/'(.*)'/)[1];
        }
            
        // implement multiLine messages
        // ie lineStart and lineEnd
        let lineNumber = parseInt(lint) - 1;
        let colStart = parseInt(column);
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
        this.log(`${JSON.stringify(completeMatch)}`);

        diagnostic = {
            severity: severity,
            range: this.createRange(lineNumber, colStart, lineNumber, colEnd),
            message: message + ': ' + object
        };

        return diagnostic;
    }
}