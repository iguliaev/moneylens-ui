"use client";

import { App as AntdApp, ConfigProvider } from "antd";
import { RefineThemes, useNotificationProvider } from "@refinedev/antd";
import { DevtoolsProvider } from "@providers/devtools";
import { Refine } from "@refinedev/core";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import routerProvider from "@refinedev/nextjs-router";
import { authProviderClient } from "@providers/auth-provider/auth-provider.client";
import { dataProvider } from "@providers/data-provider";

export function RefineProvider({ children }: { children: React.ReactNode }) {
  return (
    <RefineKbarProvider>
      <DevtoolsProvider>
        <ConfigProvider theme={RefineThemes.Blue}>
          <AntdApp>
            <Refine
              routerProvider={routerProvider}
              authProvider={authProviderClient}
              dataProvider={dataProvider}
              notificationProvider={useNotificationProvider}
              resources={[
                {
                  name: "dashboard",
                  list: "/dashboard",
                  meta: { 
                    label: "Dashboard",
                    icon: "📊",
                  },
                },
                {
                  name: "spend",
                  list: "/spend",
                  meta: { 
                    label: "Spend",
                    icon: "💸",
                  },
                },
                {
                  name: "earn",
                  list: "/earn",
                  meta: { 
                    label: "Earn",
                    icon: "💰",
                  },
                },
                {
                  name: "save",
                  list: "/save",
                  meta: { 
                    label: "Save",
                    icon: "🏦",
                  },
                },
                {
                  name: "settings",
                  list: "/settings",
                  meta: { 
                    label: "Settings",
                    icon: "⚙️",
                  },
                },
              ]}
              options={{
                syncWithLocation: true,
                warnWhenUnsavedChanges: true,
                projectId: "Sokeom-PrRZaQ-edxT0P",
              }}
            >
              {children}
              <RefineKbar />
            </Refine>
          </AntdApp>
        </ConfigProvider>
      </DevtoolsProvider>
    </RefineKbarProvider>
  );
}
