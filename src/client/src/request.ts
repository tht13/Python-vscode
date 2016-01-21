import { Uri } from 'vscode';
import { RequestType } from 'vscode-languageclient';
export namespace Request {
	export const type: RequestType<RequestParams, RequestResult, RequestError> = { get method() { return 'request'; } };
}

/**
 * The Request parameters
 */
export interface RequestParams {
	/**
	 * The process Id of the parent process that started
	 * the server.
	 */
	processId: number;

	/**
	 * The uri. Is null
	 * if no folder is open.
	 */
	uri: Uri;
}

/**
 * The result returned from an initilize request.
 */
export interface RequestResult {
    succesful: boolean;
}


/**
 * The error returned if the initilize request fails.
 */
export interface RequestError {
	/**
	 * Indicates whether the client should retry to send the
	 * initilize request after showing the message provided
	 * in the {@link ResponseError}
	 */
	retry: boolean;
}