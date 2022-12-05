// ==UserScript==
// @name         中油e学自动续集脚本
// @namespace    http://tampermonkey.net/
// @version      0.9
// @description  自动续集播放列表，监听当前播放状态自动开始播放
// @author       https://github.com/johnlin0207
// @match        https://www.excnpc.com/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=excnpc.com
// @grant        none
// @license MIT
// ==/UserScript==

(function () {
  "use strict";
  const $ = window.$ || window.jQuery;
  let findVideoInListAndOpenTimer = null;
  const o = {};
  // 视频列表页处理函数
  o.findAndPlayVideoFn = () => {
    let playLists = $(".subject-catalog").find(".catalog-state-info");
    let playItemList = [],
      firstStartOperation = null,
      continueOperation = null;
    for (let item of $(playLists)) {
      let thisLists = $(item).children();
      playItemList = [...playItemList, ...thisLists];
    }
    for (const playItem of playItemList) {
      let operation = $(playItem).find(".operation");
      let thisOpt = operation.find(".inline-block");
      // 如果存在没有学习完的，记录
      if (thisOpt.text().trim() === "继续学习") {
        // 第一个“正在播放”
        let thisId = $(operation).parent().attr("data-resource-id");
        let prevId = localStorage.getItem("prevId");
        continueOperation = operation;
        const isPlaying = localStorage.getItem("isPlaying");
        const notInPlaying = isPlaying === "false" || isPlaying === null;
        console.log(
          `2.isPlaying:%c${isPlaying}`,
          "color: black;background:yellow;"
        );
        console.log(
          `3.列表中第一条“继续学习”视频id与之前的prevId%c${
            prevId !== thisId ? "不" : ""
          }相等`,
          "color: black;background:yellow;"
        );
        // 存储的之前播放的id不等于现在列表里的第一条“正在播放”id，说明需要播放当前的这条“正在播放”
        // 或者当前没有正在播放的视频，直接播放这条“正在播放”
        if (prevId !== thisId || notInPlaying) {
          console.log("4.点击继续学习，将会打开新窗口开始播放");
          // click操作可能会报错TypeError: Cannot read properties of undefined (reading 'source')，具体原因暂未知，可能是缺少传参所致，放在try中，失败后刷新页面
          try {
            $(continueOperation).click();
            // 更新prevId为当前点击了的播放
            localStorage.setItem("prevId", thisId);
          } catch (e) {
            console.log(
              `%c自动点击第一条继续学习出错，stack: ${e.stack}`,
              "color: red"
            );
            // 刷新
            location.reload();
          }
          clearInterval(findVideoInListAndOpenTimer);
        } else {
          console.log("5.当前的继续学习正在播放，无需操作");
        }
        return false;
      } else if (thisOpt.text().trim() === "开始学习") {
        // 找到第一个开始学习
        console.log('2.没有"继续学习"选项，点击第一条"开始学习"开始播放');
        firstStartOperation = operation;
        clearInterval(findVideoInListAndOpenTimer);
        const thisId2 = $(firstStartOperation)
          .parent()
          .attr("data-resource-id");
        const prevId = localStorage.getItem("prevId");
        const isPlaying = localStorage.getItem("isPlaying");
        const notInPlaying = isPlaying === "false" || isPlaying === null;
        console.log(thisId2, prevId, isPlaying, notInPlaying);
        // 存储的之前播放的id不等于现在列表里的第一条“开始学习”id，说明需要播放当前的这条“开始学习”
        // 或者当前没有正在播放的视频，直接播放这条“正在播放”
        if (prevId !== thisId2 || notInPlaying) {
          // click操作可能会报错TypeError: Cannot read properties of undefined (reading 'source')，具体原因暂未知，可能是缺少传参所致，放在try中，失败后刷新页面
          try {
            $(firstStartOperation).click();
            localStorage.setItem("prevId", thisId2);
          } catch (e) {
            console.log(
              `%c自动点击第一条开始学习出错，stack: ${e.stack}`,
              "color: red"
            );
            // 刷新
            location.reload();
          }
        }
        return false;
      }
    }
    return true;
  };

  // 监听页面状态
  o.handlePlay = () => {
    const videoDom = $(".player-wrapper .player-content video")[0];
    // 网络出现问题时会出弹窗并暂停，需要点击弹窗的确定按钮继续播放
    if (
      $(".alert-wrapper .alert-text")
        .text()
        .match("由于服务异常，记录不到您的学习进度了")
    ) {
      $(".alert-wrapper .btn-ok").click();
    }

    // 您当前的学习出现异常，请根据完成进度，继续学习
    if (
      $(".alert-wrapper .alert-text")
        .text()
        .match("您当前的学习出现异常，请根据完成进度，继续学习")
    ) {
      $(".alert-wrapper .btn-ok").click();
    }

    // 若出现网络不稳定的提示（弹窗形式直接点击确认）
    if ($(".vjs-netslow .slow-txt").text() === "网络不稳定，请刷新重试") {
      $(".vjs-netslow .slow-img").click();
    }

    // 如果视频暂停，点击播放
    if (videoDom && videoDom.paused) {
      videoDom.play();
    }

    // 非暂停即为播放
    if (videoDom) {
      let isPlaying = !videoDom.paused;
      console.log(
        `当前视频%c${isPlaying ? "正在" : "不在"}%c播放`,
        "color: black;background:yellow;"
      );
      localStorage.setItem("isPlaying", isPlaying);
    } else {
      console.log(
        `当前视频%c无法%c播放，已停止`,
        "color: black;background:yellow;"
      );
    }
  };

  o.learningPageFn0 = () => {
    // 学习内容是视频
    const videoDom = $(".player-wrapper .player-content video")[0];
    // 学习内容是pdf文档
    const pdfViewer = $(".player-wrapper .player-content .pdfViewer")[0];
    if (videoDom) {
      // chrome66+静音后方可自动播放
      videoDom.muted = true;
      o.learningPageFn1();
    } else if (pdfViewer) {
      o.learningPageFn2();
    } else {
      console.log(">>>未匹配到学习类型，执行停止");
    }
  };

  // 学习页面针对视频播放的处理函数
  o.learningPageFn1 = () => {
    // 执行播放页面监听初始化
    o.handlePlay();
    const currentId = $(".course-chapter .section-arrow dl.focus").attr("id");
    // 找到第一个不是重新学习（即继续学习或未开始）的章节，点击播放
    const chapterList = $(".section-arrow dl");
    for (const item of chapterList) {
      const statusText = $(item)
        .find(".chapter-right .section-item div:last span")
        .text();
      if (statusText !== "重新学习") {
        // 如果此章节没在播放，点击播放；否则不处理
        if ($(item).attr("id") === currentId) {
          return;
        }
        console.log(`即将播放的章节id是${$(item).attr("id")}`);
        // 章节切换时设置isPlaying值为waiting，防止列表页在此时刻新打开视频页面
        localStorage.setItem("isPlaying", "waiting");
        item.click();
        return;
      }
    }
    console.log("%c√没有可学习的项目", "color: green");
    localStorage.setItem("isPlaying", "chapterFinished");
    o.currentLearingFinished = true;
  };

  // 学习页面针对pdf文档的处理函数
  o.learningPageFn2 = () => {
    // 执行pdf查看页面监听初始化
    localStorage.setItem("isPlaying", "true");
    const currentId = $(".course-chapter .section-arrow dl.focus").attr("id");
    // 找到第一个不是重新学习（即继续学习或未开始）的章节，点击播放
    const chapterList = $(".section-arrow dl");
    for (const item of chapterList) {
      const statusText = $(item)
        .find(".chapter-right .section-item div:last span")
        .text();
      if (statusText !== "重新学习") {
        // 如果此章节没打开学习，点击查看pdf学习；否则不处理
        if ($(item).attr("id") === currentId) {
          return;
        }
        console.log(`即将查看的章节id是${$(item).attr("id")}`);
        item.click();
        // 章节切换时设置isPlaying值为waiting
        localStorage.setItem("isPlaying", "waiting");
        return;
      }
    }
    console.log("%c√没有可学习的项目", "color: green");
    // 全部章节已学习完成，设置播放状态为false，等待列表页面下一次执行时打开新的章节
    localStorage.setItem("isPlaying", "false");
    o.currentLearingFinished = true;
  };

  // 列表加载完成
  o.onListMounted = () => {
    let count = 0;
    findVideoInListAndOpenTimer = setInterval(() => {
      const listBox = $(".subject-catalog").find(".catalog-state-info")[0];
      // 等待列表加载完成
      if (listBox) {
        // 页面加载完成，清除定时器
        clearInterval(findVideoInListAndOpenTimer);
        window.onerror = function (message, source, lineno, colno, error) {
          console.error("插件捕获的全局错误");
          console.error(message);
          console.error(source);
          console.error(error);
        };
        o.listPageFn();
      } else {
        console.log("0.等待页面加载完成...");
        // 若页面超时20s，刷新页面
        if (count > 20) {
          clearInterval(findVideoInListAndOpenTimer);
          location.reload();
        }
      }
    }, 1000);
  };

  o.listPageFn = () => {
    const recheck = 5; // 时间间隔不能过过短，否则第一次打开的页面isPlaying还未变为true，会出现重复打开同一页面的情况
    // 生成按钮，防止isPlaying错误状态时一直无法执行视频播放
    $(".page-main-wrapper").prepend(
      `<button class='clearAndPlay' title="异常关闭浏览器的视频播放页，例如浏览器崩溃卡死强行关闭等导致记录的播放状态异常，点击可手动重置状态，之后的自动播放一般不会再次出现此问题">若打开页面${recheck}s后依然没有视频打开或后台有视频正在播放，请点此按钮一次</button>`
    );
    $(".clearAndPlay").on("click", function () {
      // 异常关闭浏览器的视频播放页，例如浏览器崩溃卡死强行关闭等导致isPlaying未正常清除的情况，需要手动清除播放状态重新播放
      localStorage.removeItem("isPlaying");
      console.log("1.手动点击按钮执行列表操作");
      const result = o.findAndPlayVideoFn();
      if (result) {
        console.log("%c√没有可学习的项目", "color: green");
      }
    });
    console.log("1.准备执行列表操作");
    // 返回true说明没找到可执行的视频
    const finished = o.findAndPlayVideoFn();
    if (finished) {
      console.log("%c√没有可学习的项目", "color: green");
    } else {
      console.log(`6.若未自动打开视频播放，等待程序${recheck}s后自动重新执行`);
    }
    const refreshGap = 60;
    const timer = setInterval(() => {
      console.log("7.即将刷新页面...");
      location.reload();
    }, 1000 * refreshGap);
    if (finished) {
      clearInterval(timer);
      return;
    }

    // 确认是否自动跳转失败
    // 若页面超时5s但未打开视频播放页面(isPlaying !== true)
    // 原因1，错误的isPlaying状态-需要清除
    // 原因2，偶遇isPlaying为waiting或hasOpened-概率极低
    // 综合考虑后采用清除isPlaying方案，后果一定概率会打开多出的页面但换取了时间
    setTimeout(() => {
      if (localStorage.getItem("isPlaying") !== "true") {
        console.log(
          `%c检测到页面打开后${recheck}s依然没有跳转，将会清空isPlaying重试`,
          "color: blue"
        );
        // 若5s后isPlaying处于hasOpened或waiting阶段则会一直等待无法正常跳转。因此直接移除isPlaying，可能会出现重复打开同一页面问题，不过此种情况出现概率小，可以忽略，
        localStorage.removeItem("isPlaying");
        o.findAndPlayVideoFn();
      }
    }, recheck * 1000);
  };

  $(document).ready(function () {
    // 如果当前页面是列表页面
    if (location.hash.match(/^#\/study\/subject\/detail/)) {
      // 首次使用插件提示须知
      if (!localStorage.getItem("firstUse")) {
        if (
          window.confirm(
            "是否要开始执行自动续集播放？注意首次使用插件时浏览器会默认阻止自动打开新页签，请放行！否则插件无法正常工作"
          )
        ) {
          localStorage.setItem("firstUse", "false");
          o.onListMounted();
        }
      } else {
        // 非首次使用插件
        o.onListMounted();
      }
    }

    // 如果当前页面是学习页面
    if (location.hash.match(/^#\/study\/course\/detail/)) {
      // 打开播放页面后正式播放前将isPlaying设置为hasOpened，防止有的浏览器打开后未自动播放而导致列表页重复打开新播放页导致内存占满浏览器崩溃
      localStorage.setItem("isPlaying", "hasOpened");
      const timer2 = setInterval(() => {
        // 学习内容是视频
        const videoDom = $(".player-wrapper .player-content video")[0];
        // 学习内容是pdf文档
        const pdfViewer = $(".player-wrapper .player-content .pdfViewer")[0];
        if (videoDom || pdfViewer) {
          o.currentLearingFinished = false;
          console.log("1.页面加载完成");
          o.learningPageFn0();

          const timer3 = setInterval(() => {
            console.log("监听学习页面状态...");
            o.learningPageFn0();
          }, 1000 * 2); // 每1s监听一次当前是否在播放

          // 已学习完成，清除学习页面轮询计时器
          if (o.currentLearingFinished) {
            clearInterval(timer3);
          }

          // 关闭学习页面时将isPlaying设置为false
          window.onbeforeunload = function () {
            localStorage.setItem("isPlaying", "false");
            clearInterval(timer3);
            console.log("窗口关闭，学习暂停");
          };

          clearInterval(timer2);
        } else {
          console.log("0.等待页面加载完成...");
        }
      }, 1000);
    }

    // 动态添加css
    const style = document.createElement("style");
    style.type = "text/css";
    style.innerHTML = `
        .clearAndPlay {
            background: rgba(255,255,0,1);
            cursor: pointer;
        }

        .clearAndPlay:hover {
            background: rgba(255,255,0,.4);
        }
        `;
    document.getElementsByTagName("head").item(0).appendChild(style);
  });
})();
