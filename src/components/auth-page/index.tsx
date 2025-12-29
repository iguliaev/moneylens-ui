"use client";
import type { AuthPageProps } from "@refinedev/core";
import { AuthPage as AntdAuthPage } from "@refinedev/antd";

export const AuthPage = (props: AuthPageProps) => {
  return <AntdAuthPage {...props} />;
};
