import { RemoteConsole, Diagnostic, 
    DiagnosticSeverity, Range, 
    ITextDocument } from 'vscode-languageserver';
import { fixPath } from './../utils';

export class BaseLinter {
    protected _target: string;
    protected _args: string[];
    protected _filepath: string;
    protected _documentText: string[];
    protected _regexMatch: RegExp;
    protected _severityMap: Map<string, DiagnosticSeverity>;
    private _consoleEnabled: boolean = false;
    private _console: RemoteConsole;

    constructor(target: string, args: string[] = []) {
        this._target = target;
        this._args = args;
        this.buildSeverityMap();
    };

    getCmd(): string {
        if (this.validateFilepath(this._filepath)) {
            let cmd: string[] = [this._target, ...this._args, this._filepath];
            return cmd.join(" ");
        }
    }

    getRegex(): RegExp {
        return this._regexMatch;
    }

    setRegex(regExp: RegExp) {
        // TODO should perform a test for valid regex
        this._regexMatch = regExp;
    }

    setDocument(doc: ITextDocument) {
        let path = fixPath(doc.uri);
        if (this.validateFilepath(path)) this._filepath = path;
        this._documentText = doc.getText().split(/\r?\n/g);
        this.log(`Loaded document: ${this._filepath}`);
    }

    getFilepath(): string {
        return this._filepath;
    }
    
    // TODO validate path is actual file
    private validateFilepath(path): boolean {
        if (path === "" || path === null || path === undefined) {
            throw new ReferenceError();
        }
        return true;
    }

    fixResults(results: string[]): string[] {
        return results;
    }

    parseLintResult(line: string): Diagnostic {
        let dummyDiagnostic: Diagnostic = {
            message: "Dummy diagnostic",
            range: this.createRange(0, 0, 0, 1)
        };
        return dummyDiagnostic;
    }

    protected createRange(startLine: number, startChar: number, endLine: number, endChar: number): Range {
        return {
            start: {
                line: startLine,
                character: startChar
            },
            end: {
                line: endLine,
                character: endChar
            }
        }
    }

    protected buildSeverityMap() {
        this._severityMap = new Map<string, DiagnosticSeverity>();
    }
    
    /**
     * Enable verbose output to the console from the linter
     * @param  {RemoteConsole} console The console to write to, i.e connection.console
     */
    enableConsole(console: RemoteConsole) {
        this._consoleEnabled = true;
        this._console = console;
    }
    
    /**
     * Show an error message.
     *
     * @param message The message to show.
     */
    protected error(message: string) {
        if (this._consoleEnabled) this._console.error(message);
    }
    
    /**
     * Show a warning message.
     *
     * @param message The message to show.
     */
    protected warn(message: string) {
        if (this._consoleEnabled) this._console.warn(message);
    }
    
    /**
     * Show an information message.
     *
     * @param message The message to show.
     */
    protected info(message: string) {
        if (this._consoleEnabled) this._console.info(message);
    }
    
    /**
     * Log a message.
     *
     * @param message The message to log.
     */
    protected log(message: string) {
        if (this._consoleEnabled) this._console.log(message);
    }
}