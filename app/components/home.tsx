"use client";

require("../polyfill");

import { useState, useEffect, useRef } from "react";
import { ConfirmProvider, useConfirm } from "material-ui-confirm";

import { IconButton } from "./button";
import styles from "./home.module.scss";

import SettingsIcon from "../icons/settings.svg";
import GithubIcon from "../icons/github.svg";
import ChatGptIcon from "../icons/chatgpt.svg";

import BotIcon from "../icons/bot.svg";
import AddIcon from "../icons/add.svg";
import LoadingIcon from "../icons/three-dots.svg";
import CloseIcon from "../icons/close.svg";

import { useChatStore } from "../store";
import { isMobileScreen } from "../utils";
import Locale from "../locales";
import { Chat } from "./chat";

import dynamic from "next/dynamic";
import { REPO_URL } from "../constant";
import { ErrorBoundary } from "./error";

export function Loading(props: { noLogo?: boolean }) {
  return (
    <div className={styles["loading-content"]}>
      {!props.noLogo && <BotIcon />}
      <LoadingIcon />
    </div>
  );
}

const Settings = dynamic(async () => (await import("./settings")).Settings, {
  loading: () => <Loading noLogo />,
});

const ChatList = dynamic(async () => (await import("./chat-list")).ChatList, {
  loading: () => <Loading noLogo />,
});

function useSwitchTheme() {
  const config = useChatStore((state) => state.config);

  useEffect(() => {
    document.body.classList.remove("light");
    document.body.classList.remove("dark");

    if (config.theme === "dark") {
      document.body.classList.add("dark");
    } else if (config.theme === "light") {
      document.body.classList.add("light");
    }

    const metaDescriptionDark = document.querySelector(
      'meta[name="theme-color"][media]',
    );
    const metaDescriptionLight = document.querySelector(
      'meta[name="theme-color"]:not([media])',
    );

    if (config.theme === "auto") {
      metaDescriptionDark?.setAttribute("content", "#151515");
      metaDescriptionLight?.setAttribute("content", "#fafafa");
    } else {
      const themeColor = getComputedStyle(document.body)
        .getPropertyValue("--theme-color")
        .trim();
      metaDescriptionDark?.setAttribute("content", themeColor);
      metaDescriptionLight?.setAttribute("content", themeColor);
    }
  }, [config.theme]);
}

function useDragSideBar() {
  const limit = (x: number) => Math.min(500, Math.max(220, x));

  const chatStore = useChatStore();
  const startX = useRef(0);
  const startDragWidth = useRef(chatStore.config.sidebarWidth ?? 300);
  const lastUpdateTime = useRef(Date.now());

  const handleMouseMove = useRef((e: MouseEvent) => {
    if (Date.now() < lastUpdateTime.current + 100) {
      return;
    }
    lastUpdateTime.current = Date.now();
    const d = e.clientX - startX.current;
    const nextWidth = limit(startDragWidth.current + d);
    chatStore.updateConfig((config) => (config.sidebarWidth = nextWidth));
  });

  const handleMouseUp = useRef(() => {
    startDragWidth.current = chatStore.config.sidebarWidth ?? 300;
    window.removeEventListener("mousemove", handleMouseMove.current);
    window.removeEventListener("mouseup", handleMouseUp.current);
  });

  const onDragMouseDown = (e: MouseEvent) => {
    startX.current = e.clientX;

    window.addEventListener("mousemove", handleMouseMove.current);
    window.addEventListener("mouseup", handleMouseUp.current);
  };

  useEffect(() => {
    if (isMobileScreen()) {
      return;
    }

    document.documentElement.style.setProperty(
      "--sidebar-width",
      `${limit(chatStore.config.sidebarWidth ?? 300)}px`,
    );
  }, [chatStore.config.sidebarWidth]);

  return {
    onDragMouseDown,
  };
}

const useHasHydrated = () => {
  const [hasHydrated, setHasHydrated] = useState<boolean>(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  return hasHydrated;
};

function _Home() {
  const [createNewSession, currentIndex, removeSession] = useChatStore(
    (state) => [
      state.newSession,
      state.currentSessionIndex,
      state.removeSession,
    ],
  );
  const chatStore = useChatStore();
  const loading = !useHasHydrated();
  const [showSideBar, setShowSideBar] = useState(true);

  // setting
  const [openSettings, setOpenSettings] = useState(false);
  const config = useChatStore((state) => state.config);

  // drag side bar
  const { onDragMouseDown } = useDragSideBar();

  useSwitchTheme();

  const confirm = useConfirm();

  useEffect(() => {
    confirm();
  }, [confirm]);

  if (loading) {
    return <Loading />;
  }

  return (
    <div
      className={`${
        config.tightBorder && !isMobileScreen()
          ? styles["tight-container"]
          : styles.container
      }`}
    >
      <div
        className={styles.sidebar + ` ${showSideBar && styles["sidebar-show"]}`}
      >
        <div className={styles["sidebar-header"]}>
          <div className={styles["sidebar-title"]}>ChatGPT LV</div>
          <div className={styles["sidebar-sub-title"]}>
            Build your own AI assistant.
          </div>
          <div className={styles["sidebar-logo"]}>
            <ChatGptIcon />
          </div>
        </div>

        <div
          className={styles["sidebar-body"]}
          onClick={() => {
            setOpenSettings(false);
            setShowSideBar(false);
          }}
        >
          <ChatList />
        </div>

        <div className={styles["sidebar-tail"]}>
          <div className={styles["sidebar-actions"]}>
            <div className={styles["sidebar-action"] + " " + styles.mobile}>
              <IconButton
                icon={<CloseIcon />}
                onClick={chatStore.deleteSession}
              />
            </div>
            <div className={styles["sidebar-action"]}>
              <IconButton
                icon={<SettingsIcon />}
                onClick={() => {
                  setOpenSettings(true);
                  setShowSideBar(false);
                }}
                shadow
              />
            </div>
            {/* <div className={styles["sidebar-action"]}>
              <a href={REPO_URL} target="_blank">
                <IconButton icon={<GithubIcon />} shadow />
              </a>
            </div> */}
          </div>
          <div>
            <IconButton
              icon={<AddIcon />}
              text={Locale.Home.NewChat}
              onClick={() => {
                createNewSession();
                setShowSideBar(false);
              }}
              shadow
            />
          </div>
        </div>

        <div
          className={styles["sidebar-drag"]}
          onMouseDown={(e) => onDragMouseDown(e as any)}
        ></div>
      </div>

      <div className={styles["window-content"]}>
        {openSettings ? (
          <Settings
            closeSettings={() => {
              setOpenSettings(false);
              setShowSideBar(true);
            }}
          />
        ) : (
          <Chat
            key="chat"
            showSideBar={() => setShowSideBar(true)}
            sideBarShowing={showSideBar}
          />
        )}
      </div>
    </div>
  );
}

export function Home() {
  return (
    <ErrorBoundary>
      <ConfirmProvider
        defaultOptions={{
          title: (
            <div style={{ color: "rgb(199, 34, 39)" }}>
              【应用迁移通知！！！】
            </div>
          ),
          content: (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  flexDirection: "column",
                  marginBottom: "20px",
                }}
              >
                <div style={{ margin: "20px 0" }}>
                  本应用将不再提供AI服务，服务内容已迁移至Creator AI产品
                </div>

                <div style={{ margin: "20px 0" }}>
                  Creator
                  AI是【AI应用大爆炸】社群组队研发的AI产品，现在免费开放给大家内测
                </div>

                <h4
                  style={{
                    minWidth: "100px",
                    color: "rgb(145, 109, 213)",
                  }}
                >
                  【如何进行内测】
                </h4>
                <div style={{ margin: "20px 0" }}>
                  扫描下方公众号，回复「ai」即可
                </div>
                <img
                  style={{ marginBottom: "20px", marginTop: "5px" }}
                  width="30%"
                  src="/chat-group.png"
                />

                <h4
                  style={{
                    minWidth: "100px",
                    color: "rgb(145, 109, 213)",
                  }}
                >
                  【内测版本介绍】
                </h4>
                <div style={{ margin: "10px 0" }}>
                  1、构建你的专属AI模型，百倍提升工作效能
                </div>
                <div style={{ margin: "10px 0" }}>
                  2、与微软合作，国内目前唯一合规渠道
                </div>
                <div style={{ margin: "10px 0" }}>
                  3、内置多场景公共AI模型，直接拿来就用
                </div>
                <h4
                  style={{
                    minWidth: "100px",
                    color: "rgb(145, 109, 213)",
                  }}
                >
                  【内测福利】
                </h4>
                <div style={{ margin: "10px 0" }}>1、可以免费使用产品</div>
                <div style={{ margin: "10px 0" }}>
                  2、从首批内测人员中寻找合适的伙伴，参与2号车的开发和运营，一起赚钱
                </div>

                <h4
                  style={{
                    minWidth: "100px",
                    color: "rgb(145, 109, 213)",
                  }}
                >
                  「进入AI应用大爆炸社群」：
                </h4>
                <div style={{ marginTop: "20px" }}>
                  1、组队打造AI自媒体矩阵，一起赚钱。
                </div>
                <div style={{ margin: "20px 0" }}>
                  2、组队开发AI应用，一起赚钱。
                </div>
                <div style={{ margin: "10px 0" }}>
                  扫描下方公众号，回复「进群」即可
                </div>
                <img
                  style={{ marginBottom: "20px", marginTop: "5px" }}
                  width="30%"
                  src="/chat-group.png"
                />
              </div>

              {/* <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  margin: "10px 0",
                }}
              >
                <h4 style={{ minWidth: "100px", color: "rgb(145, 109, 213)" }}>
                  「二等奖」：
                </h4>
                <div>
                  5个独立Open AI Key（得到key之后放入本网站，独享飞一般的AI）
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <h4 style={{ minWidth: "100px", color: "rgb(145, 109, 213)" }}>
                  「额外奖」：
                </h4>
                <div>
                  本轮抽奖开启了“铁杆参与者”，分享给10个人即可获取我们的额外ChatGPT礼品哟～
                </div>
              </div> */}

              {/* <h4 style={{ color: "rgb(145, 109, 213)", marginTop: "40px" }}>
                进群方式：
              </h4> */}
            </div>
          ),
          hideCancelButton: true,
          allowClose: false,
          confirmationText: "朕已阅",
        }}
      >
        <_Home></_Home>
      </ConfirmProvider>
    </ErrorBoundary>
  );
}
