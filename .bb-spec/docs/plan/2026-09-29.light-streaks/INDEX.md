# light-streaks 实施计划
## 阶段 1：去掉实时镜面
- [01-wet-ground-env](01-wet-ground-env.md) — 湿地面改用普通着色器，水洼里取加载时拍一次的环境图
## 阶段 2：灯光光带
- [02-light-streaks](02-light-streaks.md) — 按相机与灯的镜像点算落点，路面层与停车场层各一条，信号灯颜色每帧跟随 [依赖: 01-wet-ground-env]
