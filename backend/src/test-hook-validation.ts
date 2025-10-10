// 测试文件：验证pre-commit钩子功能
// 包含可自动修复的格式问题

export class TestHookValidation {
  // 故意的格式问题（Prettier会修复）
  method(){
      const a=1;
      const b=2;
        return a+b;
  }

  // 未使用的私有变量（ESLint会警告但可标记为_开头）
  anotherMethod() {
    const _unused = 'this is fine';
    return 'success';
  }
}
