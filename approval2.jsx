import React, { useState } from "react";
import {
  Card,
  Descriptions,
  Tag,
  Steps,
  Button,
  Modal,
  InputNumber,
  Table,
  Typography,
  message,
  Space,
} from "antd";

const { Title } = Typography;
const { Step } = Steps;

type LoanStatus = "inactive" | "suggested" | "approved" | "rejected";

const ApprovalPage: React.FC = () => {
  const [status, setStatus] = useState<LoanStatus>("inactive");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [suggestedAmount, setSuggestedAmount] = useState<number | null>(null);

  // Fake user data
  const user = {
    name: "John Doe",
    email: "john@example.com",
    occupation: "Software Engineer",
    riskProfile: 3,
  };

  // Fake installment data
  const installments = [
    { key: "1", month: "Jan 2025", amount: 500, status: "Paid" },
    { key: "2", month: "Feb 2025", amount: 500, status: "Pending" },
  ];

  const columns = [
    { title: "Month", dataIndex: "month", key: "month" },
    { title: "Amount", dataIndex: "amount", key: "amount" },
    { title: "Status", dataIndex: "status", key: "status" },
  ];

  const handleSuggest = () => {
    if (!suggestedAmount) {
      message.error("Please enter an amount");
      return;
    }
    setStatus("suggested");
    setIsModalVisible(false);
    message.success(`Suggested loan amount: ${suggestedAmount}`);
  };

  const handleApprove = () => {
    setStatus("approved");
    message.success("Loan approved");
  };

  const handleReject = () => {
    setStatus("rejected");
    message.error("Loan rejected");
  };

  const getStepStatus = (step: LoanStatus) => {
    const order: LoanStatus[] = ["inactive", "suggested", "approved"];
    const currentIndex = order.indexOf(status === "rejected" ? "approved" : status);
    const stepIndex = order.indexOf(step);

    if (status === "rejected" && step === "approved") return "error";
    if (stepIndex < currentIndex) return "finish";
    if (stepIndex === currentIndex) return "process";
    return "wait";
  };

  return (
    <div style={{ padding: "1rem", maxWidth: "900px", margin: "0 auto" }}>
      {/* User Info */}
      <Card aria-label="User details" style={{ marginBottom: "1.5rem" }}>
        <Title level={4}>User Details</Title>
        <Descriptions bordered column={1}>
          <Descriptions.Item label="Name">{user.name}</Descriptions.Item>
          <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
          <Descriptions.Item label="Occupation">{user.occupation}</Descriptions.Item>
          <Descriptions.Item label="Risk Profile">
            <Tag color={user.riskProfile >= 4 ? "red" : "blue"}>
              {user.riskProfile} / 5
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Status Steps */}
      <Card style={{ marginBottom: "1.5rem" }} aria-label="Loan approval status">
        <Steps>
          <Step title="Inactive" status={getStepStatus("inactive")} />
          <Step title="Suggested" status={getStepStatus("suggested")} />
          <Step title="Approved" status={getStepStatus("approved")} />
        </Steps>
      </Card>

      {/* Installments Table */}
      <Card aria-label="Installment table" style={{ marginBottom: "4rem" }}>
        <Title level={4}>Installments</Title>
        <Table
          dataSource={installments}
          columns={columns}
          pagination={false}
          rowKey="key"
          aria-label="Installment list"
          responsive
        />
      </Card>

      {/* Action Buttons (Bottom Right) */}
      <div
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          display: "flex",
          justifyContent: "flex-end",
          gap: "1rem",
          zIndex: 10,
        }}
      >
        {status === "inactive" && (
          <Button
            type="primary"
            onClick={() => setIsModalVisible(true)}
            aria-label="Suggest loan amount"
          >
            Suggest Amount
          </Button>
        )}

        {status === "suggested" && (
          <Space>
            <Button type="primary" onClick={handleApprove} aria-label="Approve loan">
              Approve
            </Button>
            <Button danger onClick={handleReject} aria-label="Reject loan">
              Reject
            </Button>
          </Space>
        )}
      </div>

      {/* Suggest Modal */}
      <Modal
        title="Suggest Loan Amount"
        open={isModalVisible}
        onOk={handleSuggest}
        onCancel={() => setIsModalVisible(false)}
        okText="Submit"
        cancelText="Cancel"
      >
        <InputNumber
          style={{ width: "100%" }}
          placeholder="Enter loan amount"
          min={100}
          step={100}
          value={suggestedAmount ?? undefined}
          onChange={setSuggestedAmount}
          aria-label="Loan amount input"
        />
      </Modal>
    </div>
  );
};

export default ApprovalPage;
