import React, { useState } from "react";
import { useSetRecoilState } from "recoil";
import { useSWRConfig } from "swr";
import { authState } from "../recoil/authState";
import { register } from "../services/authService";
import { AuthTypes } from "../types/authTypes";
import { Form, Input, Button, Typography, Checkbox, message } from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";

const { Title } = Typography;

const RegisterPage: React.FC = () => {
  const setAuth = useSetRecoilState(authState);
  const { mutate } = useSWRConfig();
  const [loading, setLoading] = useState(false);

  const handleRegister = async (values: {
    username: string;
    password: string;
    confirmPassword: string;
    agree: boolean;
  }) => {
    setLoading(true);
    try {
      const payload: AuthTypes.reqRegister = {
        username: values.username,
        password: values.password,
      };

      const res = await register(payload);

      setAuth({
        token: res.token,
        user: res.user,
      });

      localStorage.setItem("token", res.token);
      mutate("/auth/profile");

      message.success("Registration successful!");
    } catch (err: any) {
      message.error(err.response?.data?.message || "Registration failed");
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
          Create Account
        </Title>

        <Form
          name="registerForm"
          layout="vertical"
          onFinish={handleRegister}
          aria-label="Register form"
        >
          {/* Username */}
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

          {/* Password */}
          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: "Please enter your password" },
              { min: 6, message: "Password must be at least 6 characters" },
            ]}
            hasFeedback
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Enter your password"
              aria-label="Password"
            />
          </Form.Item>

          {/* Confirm Password */}
          <Form.Item
            name="confirmPassword"
            label="Confirm Password"
            dependencies={["password"]}
            hasFeedback
            rules={[
              { required: true, message: "Please confirm your password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error("Passwords do not match")
                  );
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Confirm your password"
              aria-label="Confirm password"
            />
          </Form.Item>

          {/* Agree to Terms */}
          <Form.Item
            name="agree"
            valuePropName="checked"
            rules={[
              {
                validator: (_, value) =>
                  value
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error("You must agree to the terms and conditions")
                      ),
              },
            ]}
          >
            <Checkbox aria-label="Agree to terms and conditions">
              I agree to the <a href="/terms">Terms and Conditions</a>
            </Checkbox>
          </Form.Item>

          {/* Submit */}
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              aria-label="Register"
            >
              Register
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default RegisterPage;
