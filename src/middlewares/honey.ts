import beeline from "honeycomb-beeline";
import Libhoney from "libhoney";
import * as middy from "middy";

beeline({
  writeKey: process.env.HONEYCOMB_WRITE_KEY || "",
  dataset: process.env.HONEYCOMB_DATASET || "serverless-blog",
  serviceName: "blog-api",
});

const honeycomb = () => {
  return {
    async before(handler: middy.IHandlerLambda) {
      const context: any = handler.event.requestContext || {};

      const trace = beeline.startTrace({
        "request.resource_path": context.resourcePath,
        "request.id": context.requestId,
        "request.protocol": context.protocol,
        "request.method": context.httpMethod,
        "request.principal": context.authorizer ? context.authorizer.principalId : undefined,
        "request.scope": context.authorizer ? context.authorizer.scope : undefined,
        "name": handler.context.functionName,
        "function.version": handler.context.functionVersion,
      });
      handler.event.trace = trace;
    },

    async after(handler: middy.IHandlerLambda) {
      finalizeEvent(handler);
    },

    async onError(handler: middy.IHandlerLambda) {
      if (handler.error && handler.error.message) {
        beeline.addContext({ error: handler.error.message });
      }

      finalizeEvent(handler);
    },
  };
};

function finalizeEvent(handler: middy.IHandlerLambda) {
  const trace = handler.event.trace;
  if (!trace) {
    return;
  }

  const response: any = handler.response;
  if (response && response.statusCode) {
    beeline.addContext({ "response.status_code": response.statusCode });
  }

  beeline.addContext({ remaining_ms: handler.context.getRemainingTimeInMillis() });
  beeline.finishTrace(trace);
}

export default honeycomb;
