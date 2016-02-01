import 'process';

/**
 * Takes a uri path and fixes it to be a file path
 * * Removes 'file://'
 * * Converts C%3A/ -> C:\\
 * @param  {string} path
 * @returns string
 */
export function fixPath(path: string): string {
    if (/^win/.test(process.platform)) {
        path = path.replace('file:///', '').replace('%3A', ':').replace('/', '\\');
    } else {
        path = path.replace('file://', '');
    }
    return path;
}