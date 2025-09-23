import React, { useState } from "react";
import { useSetRecoilState } from "recoil";
import { useSWRConfig } from "swr";
import { authState } from "../recoil/authState";
import { login } from "../services/authService";
import { AuthTypes } from "../types/authTypes";
import { Form, Input, Button, Typography, message } from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";

const { Title } = Typography;

const LoginPage: React.FC = () => {
  const setAuth = useSetRecoilState(authState);
  const { mutate } = useSWRConfig();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values: AuthTypes.reqLogin) => {
    setLoading(true);
    try {
      const res = await login(values);

      setAuth({
        token: res.token,
        user: res.user,
      });

      // store token for persistence
      localStorage.setItem("token", res.token);

      // refresh SWR cache for profile
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
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: "Please enter your username" }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Enter your username"
              aria-label="Username"
            />
          </Form.Item>

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
