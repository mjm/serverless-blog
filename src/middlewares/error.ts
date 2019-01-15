import * as middy from 'middy';

const errorTable: {[key: string]: string} = {
  400: 'invalid_request',
  401: 'unauthorized',
  403: 'forbidden',
  500: 'internal_error'
};

const errorHandler = () => {
  return {
    onError(handler: any, next: middy.IMiddyNextFunction) {
      console.error(handler.error);

      handler.response = handler.response || {};

      if ('statusCode' in handler.error) {
        const errorType = handler.error.code || errorTable[handler.error.statusCode] || 'unknown';

        handler.response.statusCode = handler.error.statusCode;
        handler.response.body = JSON.stringify({
          error: errorType,
          error_description: handler.error.message
        });
      } else {
        handler.response.statusCode = 500;
        handler.response.body = JSON.stringify({
          error: "internal_error",
          error_description: handler.error.message || 'An unknown error occurred'
        });
      }

      next();
    }
  };
};

export default errorHandler;
