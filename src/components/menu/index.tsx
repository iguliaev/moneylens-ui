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

  // Create a map of resource keys to routes for easy lookup
  const resourceRoutes = new Map<string, string>();
  resources.forEach((resource) => {
    if (resource.list) {
      resourceRoutes.set(resource.name, resource.list);
    }
  });
  menuItems.forEach((item) => {
    if (item.route) {
      resourceRoutes.set(item.key, item.route);
    }
  });

  const handleMenuClick = (info: { key: string }) => {
    const route = resourceRoutes.get(info.key);
    if (route) {
      go({ to: route });
    }
  };

  const items: MenuProps["items"] = menuItems.map((item) => {
    // Find all child resources for this parent
    const children = resources
      .filter((resource) => resource.meta?.parent === item.name && resource.list)
      .map((child) => ({
        key: child.name,
        icon: child.meta?.icon,
        label: child.meta?.label || child.name,
      }));

    if (children.length > 0) {
      return {
        key: item.key,
        icon: item.icon,
        label: item.label,
        children,
      };
    }

    return {
      key: item.key,
      icon: item.icon,
      label: item.label,
    };
  });

  return (
    <nav className="menu" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <AntdMenu
        mode="inline"
        selectedKeys={selectedKey ? [selectedKey] : []}
        items={items}
        onClick={handleMenuClick}
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
