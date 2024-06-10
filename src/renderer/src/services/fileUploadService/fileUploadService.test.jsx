import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { getUploadLink, uploadFile, getDownloadLink } from "./fileUploadService";

const mock = new MockAdapter(axios);

describe("File Upload Service", () => {
    afterEach(() => {
        mock.reset();
    });

    it("should fetch a presigned URL for file upload", async () => {
        const token = "your-access-token";
        const fileName = "file.txt";
        const expectedResponse = {
            presigned: "http://presigned-url",
            bucket_name: "bucket-name",
            minio_file_link: "http://minio-file-link",
        };

        mock.onGet("/file-transfer/upload").reply(200, expectedResponse);

        const response = await getUploadLink(token, fileName);

        expect(response.data).toEqual(expectedResponse);
        expect(mock.history.get[0].headers.Authorization).toBe(`Bearer ${token}`);
        expect(mock.history.get[0].params.fileName).toBe(fileName);
    });

    it("should upload a file using a presigned URL", async () => {
        const uploadUrl = "http://presigned-url";
        const file = new File(["file content"], "file.txt", { type: "text/plain" });
        const expectedResponse = { message: "File uploaded successfully" };

        mock.onPut(uploadUrl).reply(200, expectedResponse);

        const response = await uploadFile(uploadUrl, file);

        expect(response.data).toEqual(expectedResponse);
        expect(mock.history.put[0].headers["Content-Type"]).toBe(file.type);
        expect(mock.history.put[0].data).toBe(file);
    });

    it("should fetch a presigned URL for file download", async () => {
        const token = "your-access-token";
        const bucketName = "bucket-name";
        const minioFileName = "12345-file.txt";
        const expectedResponse = {
            presigned: "http://presigned-url",
        };

        mock.onGet("/file-transfer/download").reply(200, expectedResponse);

        const response = await getDownloadLink(token, bucketName, minioFileName);

        expect(response.data).toEqual(expectedResponse);
        expect(mock.history.get[0].headers.Authorization).toBe(`Bearer ${token}`);
        expect(mock.history.get[0].params.bucketName).toBe(bucketName);
        expect(mock.history.get[0].params.minioFileName).toBe(minioFileName);
    });
});
