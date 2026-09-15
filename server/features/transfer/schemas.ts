const str = (maxLength = 2000, minLength = 1) => ({ type: 'string', minLength, maxLength });
const num = (minimum = 0, maximum = 1e12) => ({ type: 'number', minimum, maximum });
const int = (minimum = 0, maximum = Number.MAX_SAFE_INTEGER) => ({ type: 'integer', minimum, maximum });
const en = (...values: string[]) => ({ type: 'string', enum: values });
const arr = (items: object, maxItems = 20, minItems = 0) => ({ type: 'array', items, minItems, maxItems });
const obj = (properties: Record<string, object>) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const nullable = (schema: object) => ({ anyOf: [schema, { type: 'null' }] });
const bool = { type: 'boolean' };
const id = str(200);
const sourceRef = obj({ type: en('record','visit','place','checkin','route'), id, version: int(1) });
const position = obj({ longitude: num(-180, 180), latitude: num(-90, 90) });
const step = obj({ id, meaning: str(), sourceRecordIds: arr(id, 20, 1), stayMinutes: int(0, 1440), required: bool });
const recipeInput = obj({ id, title: str(200), meaning: str(), sourceRefs: arr(sourceRef, 200, 1), steps: arr(step, 9, 1), requiredConditions: arr(str()), allowedChanges: arr(str()) });
const versioned = { version: int(1), createdAt: int(), updatedAt: int() };
const recipe = obj({ ...recipeInput.properties, ...versioned });
const planInput = obj({ id, recipeId: id, recipeVersion: int(1), region: str(300), start: position, mode: en('walking','driving'), timeBudgetMinutes: int(1,1440), preferences: str(4000,0) });
const candidate = obj({ placeId: id, version: int(1), name: str(500), position, stepIds: arr(id,9,1) });
const planStep = obj({ stepId: id, placeId: nullable(id), explanation: str(), evidenceIds: arr(id,100) });
const conditionCheck = obj({ condition: str(), status: en('satisfied','unmet','unknown'), explanation: str(), evidenceIds: arr(id,100) });
const proposal = obj({ variant: en('faithful','personalized'), steps: arr(planStep,9,1), explanation: str(), conditionChecks: arr(conditionCheck), unmetConditions: arr(str()), unknowns: arr(str()) });
export const transferOutputSchema = obj({ plans: arr(proposal,2,2), commonalities: arr(str()), differences: arr(str()) });
export const transferInputSchema = obj({ planSetId: id });
const route = obj({ id, durationSeconds: num(), distanceMeters: num(), expiresAt: int(), sourceRefs: arr(sourceRef,200) });
const plan = obj({ ...proposal.properties, route: nullable(route), travelMinutes: nullable(num()), stayMinutes: num(), totalMinutes: nullable(num()), eligible: bool });
const planSet = obj({ ...planInput.properties, recipe, sourceRefs: arr(sourceRef,200,1), candidates: arr(candidate,100), generatorVersion: str(100),
  status: en('pending','running','complete','incomplete','failed','cancelled','adopted'), assistantMessageId: nullable(id), assistantAttempt: nullable(int(1)), plans: arr(plan,2), commonalities: arr(str()), differences: arr(str()),
  selectedVariant: nullable(en('faithful','personalized')), savedRouteId: nullable(id), error: nullable(obj({ code: str(100), message: str(), retryable: bool })), ...versioned });
export const transferSchemas = {
  TransferRecipeInput: recipeInput, TransferRecipe: recipe, TransferPlanInput: planInput, TransferPlanSet: planSet,
  TransferAiInput: transferInputSchema, TransferAiOutput: transferOutputSchema,
  TransferAdoptionInput: obj({ variant: en('faithful','personalized') }),
};
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const response = (schema: object, description = '成功') => ({ description, content: { 'application/json': { schema: obj({ data: schema }) } } });
const body = (name: string) => ({ required: true, content: { 'application/json': { schema: ref(name) } } });
const header = (name: string) => ({ in: 'header', name, required: true, schema: str(200) });
const path = (name: string) => ({ in: 'path', name, required: true, schema: id });
function operation(method: string, pathValue: string, operationId: string, responseSchema: object, input?: string, version = false, status = '200') {
  const parameters: object[] = [header('X-Request-Id')];
  for (const match of pathValue.matchAll(/\{([^}]+)\}/g)) parameters.push(path(match[1]));
  if (method === 'post') parameters.push(header('Idempotency-Key'));
  if (version) parameters.push(header('If-Match'));
  return { method, path: pathValue, operationId, tags: ['TRANSFER'], parameters, ...(input ? { requestBody: body(input) } : {}),
    responses: { [status]: response(responseSchema), default: { description: '共通エラー。根拠変更/閲覧不可/期限切れ/版競合では採用しない。', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } } } };
}
export const transferFragment = { taskId: 'TRANSFER', version: 2, schemas: transferSchemas, operations: [
  operation('post','/transfer/recipes','createTransferRecipe',ref('TransferRecipe'),'TransferRecipeInput',false,'201'),
  operation('get','/transfer/recipes','listTransferRecipes',obj({ items: arr(ref('TransferRecipe'),100) })),
  operation('get','/transfer/recipes/{recipeId}','getTransferRecipe',ref('TransferRecipe')),
  operation('patch','/transfer/recipes/{recipeId}','replaceTransferRecipe',ref('TransferRecipe'),'TransferRecipeInput',true),
  operation('post','/transfer/plan-sets','createTransferPlanSet',ref('TransferPlanSet'),'TransferPlanInput',false,'202'),
  operation('get','/transfer/plan-sets','listTransferPlanSets',obj({ items: arr(ref('TransferPlanSet'),100) })),
  operation('get','/transfer/plan-sets/{planSetId}','getTransferPlanSet',ref('TransferPlanSet')),
  operation('post','/transfer/plan-sets/{planSetId}/adoption','adoptTransferPlan',ref('TransferPlanSet'),'TransferAdoptionInput',true),
] };
