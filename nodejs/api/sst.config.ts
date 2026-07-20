/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "mail-rocket-api",
      // Production infra survives `sst remove`; every other stage is
      // disposable so personal `sst dev` stages don't linger in the account.
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: input?.stage === "production",
      home: "aws",
    };
  },
  async run() {
    // Neon connection string and JWT signing secret, stored in SSM via SST
    // rather than committed to the repo. Set per stage with:
    //   npx sst secret set DbUrl "<neon-pooled-url>" --stage production
    //   npx sst secret set JwtSecret "<secret>" --stage production
    const dbUrl = new sst.Secret("DbUrl");
    const jwtSecret = new sst.Secret("JwtSecret");

    // Defined standalone (rather than inline via `api.route()`) so its ARN
    // can be referenced by the OpenAPI integrations below instead of relying
    // on a single catch-all route.
    const apiFunction = new sst.aws.Function("ApiFunction", {
      handler: "index.handler",
      runtime: "nodejs24.x",
      environment: {
        DB_URL: dbUrl.value,
        JWT_SECRET: jwtSecret.value,
        NODE_ENV: $app.stage,
      },
      url: false,
    });

    // TODO: once the OpenAPI spec (rendered from the .tftpl) is in the repo,
    // pass it here as `transform.api.body` so API Gateway creates one route
    // per path/method from the spec instead of a catch-all:
    //
    // const api = new sst.aws.ApiGatewayV2("Api", {
    //   transform: {
    //     api: {
    //       body: renderedOpenApiSpec, // references apiFunction.arn per route
    //     },
    //   },
    // });
    const api = new sst.aws.ApiGatewayV2("Api");

    return {
      api: api.url,
      apiFunction: apiFunction.arn,
    };
  },
});
