"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aoai = void 0;
const openai_1 = require("openai");
const env_js_1 = require("./env.js");
exports.aoai = new openai_1.AzureOpenAI({
    apiKey: env_js_1.ENV.AZURE_OPENAI_KEY,
    endpoint: env_js_1.ENV.AZURE_OPENAI_ENDPOINT,
    apiVersion: env_js_1.ENV.AZURE_OPENAI_API_VERSION,
    deployment: env_js_1.ENV.AZURE_OPENAI_DEPLOYMENT
});
