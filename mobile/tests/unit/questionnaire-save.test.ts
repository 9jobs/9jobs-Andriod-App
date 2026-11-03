import AsyncStorage from "@react-native-async-storage/async-storage";
import { getBackendAuthToken } from "@/lib/data/backend-auth-token";
import { uploadQuestionnaireDocument, submitCandidateQuestionnaire, getCachedCandidateQuestionnaire,
  saveQuestionnaireDraft, loadQuestionnaireDraft, clearQuestionnaireDraft, type CandidateQuestionnaireInput } from "@/lib/data/candidate-questionnaire";
import type { SessionUser } from "@/types/auth";

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("@/lib/data/backend-auth-token", () => ({ getBackendAuthToken: jest.fn(async () => "token"), resolveBackendUrl: () => "https://backend.example" }));
jest.mock("@/lib/perf/livePerf", () => ({ startTrackedRequest: () => ({ finish: jest.fn() }) }));

const user: SessionUser = { id:"save-client",email:"candidate@example.invalid",fullName:"Candidate" };
const file = { name:"Resume.pdf",mimeType:"application/octet-stream",uri:"content://documents/resume",size:100 };
function reply(status:number,payload:unknown) {
  return {status,ok:status>=200&&status<300,json:async()=>payload,headers:{get:()=>null}} as unknown as Response;
}
let requests:jest.Mock;
beforeEach(async()=>{ await AsyncStorage.clear();jest.clearAllMocks();requests=jest.fn();globalThis.fetch=requests; });

test("Android sends picker URI directly to signed storage without fetching or rebuilding a Blob",async()=>{
  requests.mockResolvedValueOnce(reply(200,{storagePath:"save-client/resume/Resume.pdf",signedUrl:"https://storage.example/signed"}))
    .mockResolvedValueOnce(reply(200,{}));
  await expect(uploadQuestionnaireDocument(user,"resume",file)).resolves.toEqual({path:"save-client/resume/Resume.pdf",name:"Resume.pdf"});
  expect(requests).toHaveBeenCalledTimes(2);
  expect(requests.mock.calls[1][0]).toBe("https://storage.example/signed");
  const parts=requests.mock.calls[1][1].body.getParts();
  expect(parts[1]).toMatchObject({uri:file.uri,name:file.name,type:"application/pdf"});
  expect(requests.mock.calls[1][1].headers.Authorization).toBeUndefined();
});
test("renews rejected authentication once while preparing the upload",async()=>{
  (getBackendAuthToken as jest.Mock).mockResolvedValueOnce("old").mockResolvedValueOnce("new");
  requests.mockResolvedValueOnce(reply(401,{})).mockResolvedValueOnce(reply(200,{storagePath:"path",signedUrl:"https://storage.example/signed"})).mockResolvedValueOnce(reply(200,{}));
  await uploadQuestionnaireDocument(user,"resume",file);
  expect((requests.mock.calls[1][1].headers as Headers).get("Authorization")).toBe("Bearer new");
  expect(getBackendAuthToken).toHaveBeenLastCalledWith(user,expect.objectContaining({forceRefresh:true,rejectedToken:"old"}));
});
test("unavailable storage is reported without trying an ephemeral file upload",async()=>{
  requests.mockResolvedValueOnce(reply(503,{error:"Document storage is temporarily unavailable"}));
  await expect(uploadQuestionnaireDocument(user,"resume",file)).rejects.toThrow("Document storage is temporarily unavailable");
  expect(requests).toHaveBeenCalledTimes(1);
});
test("only a server-confirmed completed questionnaire is cached",async()=>{
  const row={user_id:user.id,completed_at:"2026-10-27T10:00:00Z"};
  requests.mockResolvedValueOnce(reply(200,{success:true,questionnaire:row}));
  await submitCandidateQuestionnaire(user,{} as CandidateQuestionnaireInput);
  expect(await getCachedCandidateQuestionnaire(user.id)).toEqual(row);
  await AsyncStorage.clear();
  requests.mockResolvedValueOnce(reply(200,{success:true}));
  await expect(submitCandidateQuestionnaire(user,{} as CandidateQuestionnaireInput)).rejects.toThrow("did not confirm");
  expect(await getCachedCandidateQuestionnaire(user.id)).toBeNull();
});
test("drafts survive a failed save and are isolated per user",async()=>{
  const draft={step:11,form:{fullName:"Candidate"},resume:file};
  await saveQuestionnaireDraft(user.id,draft);
  requests.mockResolvedValueOnce(reply(503,{error:"Storage unavailable"}));
  await expect(submitCandidateQuestionnaire(user,{} as CandidateQuestionnaireInput)).rejects.toThrow();
  expect(await loadQuestionnaireDraft(user.id)).toEqual(draft);
  expect(await loadQuestionnaireDraft("other-user")).toBeNull();
  await clearQuestionnaireDraft(user.id);
  expect(await loadQuestionnaireDraft(user.id)).toBeNull();
});
