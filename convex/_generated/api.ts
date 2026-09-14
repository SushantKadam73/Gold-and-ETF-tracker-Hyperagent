/* eslint-disable */
// PLACEHOLDER for offline build/typecheck. `npx convex dev` regenerates the real typed API.
// Returns a stable query-reference-like object so Convex's useQuery can read its symbol during prerender.
const fnName = Symbol.for("functionName");
function makeRef(name: string) {
  return { [fnName]: name, _name: name } as any;
}
const handler: ProxyHandler<any> = {
  get: (_t, prop: string) => makeRef(String(prop)),
};
export const api: any = new Proxy({}, { get: () => new Proxy({}, handler) });
export const internal: any = new Proxy({}, { get: () => new Proxy({}, handler) });
