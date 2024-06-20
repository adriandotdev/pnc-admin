const MerchantService = require("../services/MerchantService");
const { HttpBadRequest } = require("../utils/HttpError");
// Mock modules or dependencies
jest.mock("generate-password", () => ({
	generate: jest.fn().mockReturnValue("mockPassword"), // Mock password generator
}));

jest.mock("../utils/Email.js", () => {
	return jest.fn().mockImplementation(() => ({
		SendUsernameAndPassword: jest.fn().mockResolvedValue(undefined), // Mock email sending
	}));
});

// Assuming you have a mock implementation for #repository methods
const mockRepository = {
	RegisterCPO: jest.fn().mockResolvedValue([[{ STATUS: "ERROR" }]]),
	AuditTrail: jest.fn().mockResolvedValue(undefined),
	CheckRegisterCPO: jest
		.fn()
		.mockImplementation((type, value) => [[{ STATUS: "SUCCESS" }]]),
};

// Example test using Jest
describe("RegisterCPO", () => {
	let registrationService;

	beforeEach(() => {
		registrationService = new MerchantService(mockRepository);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it("should registers a Charging Point Operator successfully", async () => {
		// Setup
		mockRepository.RegisterCPO = jest
			.fn()
			.mockResolvedValue([[{ STATUS: "SUCCESS" }]]);
		registrationService = new MerchantService(mockRepository);
		const testData = {
			username: "testuser",
			contact_email: "test@example.com",
			admin_id: 1,
		};

		// Execution
		const result = await registrationService.RegisterCPO(testData);

		// Verification
		expect(result).toBe("SUCCESS");
		expect(mockRepository.RegisterCPO).toHaveBeenCalledWith({
			...testData,
			password: "mockPassword", // Check if password is correctly generated
		});
		expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
			admin_id: testData.admin_id,
			cpo_id: null,
			action: "REGISTER Charging Point Operator",
			remarks: "success",
		});
		expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
	});

	it("should return Bad Request", async () => {
		mockRepository.RegisterCPO = jest
			.fn()
			.mockResolvedValue([[{ STATUS: "ERROR" }]]);

		registrationService = new MerchantService(mockRepository);

		const testData = {
			username: "testuser",
			contact_email: "test@example.com",
			admin_id: 1,
			// Add other required fields for your test case
		};

		await expect(registrationService.RegisterCPO(testData)).rejects.toThrow(
			HttpBadRequest
		);
	});

	it("should result to Success in CheckRegisterCPO", async () => {
		registrationService = new MerchantService(mockRepository);

		const usernameResult = await registrationService.CheckRegisterCPO(
			"username",
			"testuser"
		);
		const mobileNumberResult = await registrationService.CheckRegisterCPO(
			"contact_number",
			"09231123312"
		);
		const mobileNumberResult2 = await registrationService.CheckRegisterCPO(
			"contact_number",
			"+639112231123"
		);
		const emailResult = await registrationService.CheckRegisterCPO(
			"contact_email",
			"email@gmail.com"
		);

		expect(usernameResult).toBe("SUCCESS");
		expect(mobileNumberResult).toBe("SUCCESS");
		expect(mobileNumberResult2).toBe("SUCCESS");
		expect(emailResult).toBe("SUCCESS");
	});

	it("should result to Failure when username is not valid in CheckRegisterCPO", async () => {
		registrationService = new MerchantService(mockRepository);

		await expect(
			registrationService.CheckRegisterCPO("username", "testuser1!!!")
		).rejects.toThrow(HttpBadRequest);
		await expect(
			registrationService.CheckRegisterCPO("contact_number", "08231123312")
		).rejects.toThrow(HttpBadRequest);
		await expect(
			registrationService.CheckRegisterCPO("contact_number", "+61231123312")
		).rejects.toThrow(HttpBadRequest);
	});
});
