"use client";

import { useLogout, useMenu, useGo, useResource } from "@refinedev/core";
import { Menu as AntdMenu, Button } from "antd";
import { LogoutOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";

export const Menu = () => {
  const { mutate: logout } = useLogout();
  const { menuItems, selectedKey } = useMenu();
  const { resources } = useResource();
  const go = useGo();

  const items: MenuProps["items"] = menuItems.map((item) => {
    // Find all child resources for this parent
    const children = resources
      .filter((resource) => resource.meta?.parent === item.name && resource.list)
      .map((child) => ({
        key: child.name,
        icon: child.meta?.icon,
        label: child.meta?.label || child.name,
        onClick: () => {
          if (child.list) {
            go({ to: child.list });
          }
        },
      }));

    if (children.length > 0) {
      return {
        key: item.key,
        icon: item.icon,
        label: item.label,
        children,
        onClick: () => {
          if (item.route) {
            go({ to: item.route });
          }
        },
      };
    }

    return {
      key: item.key,
      icon: item.icon,
      label: item.label,
      onClick: () => {
        if (item.route) {
          go({ to: item.route });
        }
      },
    };
  });

  return (
    <nav className="menu" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <AntdMenu
        mode="inline"
        selectedKeys={selectedKey ? [selectedKey] : []}
        items={items}
        style={{ flex: 1, borderRight: 0 }}
      />
      <div style={{ padding: "16px" }}>
        <Button
          type="default"
          icon={<LogoutOutlined />}
          onClick={() => logout()}
          data-testid="logout"
          block
        >
          Logout
        </Button>
      </div>
    </nav>
  );
};
