export class ExplorationError extends Error {
 constructor(code,message,details={}) { super(message);this.name='ExplorationError';this.code=code;this.details=details; }
}
export function fail(code,message,details) { throw new ExplorationError(code,message,details); }
export function assertInput(ok,message) { if(!ok) fail('INVALID_INPUT',message); }
