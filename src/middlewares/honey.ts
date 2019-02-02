import Libhoney from "libhoney";
import * as middy from "middy";

let honey = new Libhoney({
  writeKey: process.env.HONEYCOMB_WRITE_KEY || "",
  dataset: process.env.HONEYCOMB_DATASET || "serverless-blog"
});

const honeycomb = () => {
  return {
    async before(handler: middy.IHandlerLambda) {
      let event = honey.newEvent();
      handler.event.honey = event;

      let context: any = handler.context;

      if (context.resourcePath) {
        event.addField("request.resource_path", context.resourcePath);
      }
      if (context.requestId) {
        event.addField("request.id", context.requestId);
      }
      if (context.protocol) {
        event.addField("request.protocol", context.protocol);
      }
      if (context.httpMethod) {
        event.addField("request.method", context.httpMethod);
      }
      if (context.authorizer) {
        if (context.authorizer.principalId) {
          event.addField("request.principal", context.authorizer.principalId);
        }
        if (context.authorizer.scope) {
          event.addField("request.scope", context.authorizer.scope);
        }
      }

      if (context.functionName) {
        event.addField("function.name", context.functionName);
      }
      if (context.functionVersion) {
        event.addField("function.version", context.functionVersion);
      }
    },

    async after(handler: middy.IHandlerLambda) {
      let event = handler.event.honey;

      let response: any = handler.response;
      if (response && response.statusCode) {
        event.addField("response.status_code", response.statusCode);
      }

      event.send();
    },

    async onError(handler: middy.IHandlerLambda) {
      let event = handler.event.honey;

      if (handler.error && handler.error.message) {
        event.addField("error", handler.error.message);
      }
      let response: any = handler.response;
      if (response && response.statusCode) {
        event.addField("response.status_code", response.statusCode);
      }

      event.send();
    }
  };
};

export default honeycomb;
