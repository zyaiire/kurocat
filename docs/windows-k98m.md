# Windows 配置指南 · K98M Plus 蓝紫键盘与金瞳小黑猫

适用于 Windows 10 / 11 x64。此版本来自个人 fork 的 `k98m-golden-cat` 分支。要得到经典手绘预览的效果，选择 **金瞳小黑猫、2D 经典、K98M Plus、面向观众**。

## 在 Windows 上运行这个版本

已有从该分支构建的 `*-setup.exe` 时，退出正在运行的 KuroCat，双击安装包，随后从开始菜单启动 KuroCat。README 中的上游下载链接和应用内更新均指向原项目；后续更新个人版时，请继续使用本分支构建的安装包。

从源码运行时，准备 Git、Node.js 22（含 npm）、Rust stable 的 MSVC 工具链和 Visual Studio Build Tools 的「使用 C++ 的桌面开发」工作负载（含 Windows SDK）。桌面界面使用 Microsoft Edge WebView2 Runtime。具体安装步骤见 [Tauri 的 Windows 环境配置](https://v2.tauri.app/start/prerequisites/#windows)。

打开 PowerShell，执行以下命令。最后一行会启动桌宠，首次编译 Rust 依赖需要一些时间。

```powershell
git clone --branch k98m-golden-cat --single-branch https://github.com/zyaiire/kurocat.git
cd kurocat
npm ci
npm run tauri:dev
```

如需生成可分发的安装包，在项目目录另开 PowerShell，或按 Ctrl+C 结束调试，再运行：

```powershell
npm run tauri -- build --bundles nsis
Get-ChildItem .\src-tauri\target\release\bundle\nsis\*-setup.exe
```

## 还原经典预览的外观

右键单击桌面上的猫打开菜单。如果已开启「锁定鼠标穿透」，按住 Alt 再右键单击。

| 菜单位置 | 选择 | 效果 |
| --- | --- | --- |
| 角色外观 | 金瞳小黑猫 | 经典黑猫的轮廓和动作，眼睛呈金黄色 |
| 视觉模式 | 2D 经典 | 使用原版手绘造型 |
| 键盘配列与方向 | K98M Plus | 蓝紫色 98 键配列，带独立数字区 |
| 键盘配列与方向 | 面向观众 | 从屏幕正面读键帽，数字区在右侧 |

首次使用全新配置时，个人版默认选中金瞳小黑猫和 K98M Plus；视觉模式默认为 3D，键盘朝向默认为面向猫咪。装过旧版时，程序会读取已有设置，可按上表逐项切换。

打开记事本，按一下 A，再分别按主回车和数字区回车，观察猫的拍键反馈。想对照眼色，可在「2D 经典」下交替选择「小黑猫」和「金瞳小黑猫」。

## 查看或迁移已有配置

在资源管理器地址栏输入 `%APPDATA%\kuro-cat-pet`，打开 `settings.json`。菜单选择会自动保存。若需手动编辑，先从菜单退出 KuroCat，备份文件，在已有 JSON 中修改下表四项，再启动应用。

| 字段 | 对应经典预览的值 |
| --- | --- |
| `catBreed` | `"gold-black"` |
| `renderMode` | `"2d"` |
| `keyboardLayout` | `"k98m"` |
| `keyboardOrientation` | `"viewer"` |

如果菜单里找不到「K98M Plus」或「金瞳小黑猫」，请确认运行的是此分支生成的程序。可先退出托盘中的 KuroCat，再从本分支目录运行 `npm run tauri:dev` 核对。
