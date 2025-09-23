import React, { useState } from "react";
import { useSetRecoilState } from "recoil";
import { useSWRConfig } from "swr";
import { authState } from "../recoil/authState";
import { login } from "../services/authService";
import { AuthTypes } from "../types/authTypes";
import { Form, Input, Button, Typography, message } from "antd";
import { LockOutlined, MailOutlined } from "@ant-design/icons";

const { Title } = Typography;

const LoginPage: React.FC = () => {
  const setAuth = useSetRecoilState(authState);
  const { mutate } = useSWRConfig();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values: AuthTypes.reqLogin) => {
    setLoading(true);
    try {
      const res = await login(values);

      setAuth({ token: res.token, user: res.user });
      localStorage.setItem("token", res.token);

      // refresh profile cache
      mutate("/auth/profile");

      message.success("Login successful!");
    } catch (err: any) {
      message.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f5f7fa",
        padding: "1rem",
      }}
    >
      <div
        style={{
          maxWidth: "400px",
          width: "100%",
          background: "#fff",
          padding: "2rem",
          borderRadius: "8px",
          boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
        }}
      >
        <Title level={3} style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          Loan App Login
        </Title>

        <Form<AuthTypes.reqLogin>
          name="loginForm"
          layout="vertical"
          onFinish={handleLogin}
          aria-label="Login form"
        >
          {/* Email */}
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Please enter your email" },
              { type: "email", message: "Please enter a valid email" },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="Enter your email"
              aria-label="Email"
            />
          </Form.Item>

          {/* Password */}
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: "Please enter your password" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Enter your password"
              aria-label="Password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              aria-label="Login"
            >
              Login
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default LoginPage;
