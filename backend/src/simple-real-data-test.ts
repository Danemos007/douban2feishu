/**
 * 简化的真实数据测试 - 使用现有测试命令的结果
 */

import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

const userCookie = 'll="example"; bid=example_bid; _pk_id.100001.3ac3=0449f71f29bd6367.1755942050.; _pk_ses.100001.3ac3=1; ap_v=0,6.0; viewed="36973237"; dbcl2="your_user_id:example_secret"; ck=Bz9H; frodotk_db="295cad07cf30f1b47c1607176d92d51c"; push_noty_num=0; push_doumail_num=0; ct=y';
const userId = 'your_user_id';

async function testRealDoubanData() {
  console.log('🧪 简化的真实豆瓣数据测试');
  console.log('========================');
  console.log(`👤 用户ID: ${userId}`);
  console.log('');

  try {
    // 测试1: 获取书籍数据("读过"状态)
    console.log('📚 测试1: 获取书籍数据("读过"状态)...');
    
    const bookCommand = `npm run test:douban "${userCookie}" "${userId}"`;
    console.log('执行命令:', bookCommand.substring(0, 50) + '...');
    
    try {
      const { stdout, stderr } = await execAsync(bookCommand);
      console.log('✅ 书籍数据获取成功!');
      console.log('\n📖 书籍数据结果:');
      console.log(stdout);
      if (stderr) {
        console.log('⚠️ 警告信息:', stderr);
      }
    } catch (error: any) {
      console.log('❌ 书籍数据获取失败:', error.message);
    }

    console.log('\n' + '='.repeat(50));

    // 测试2: 获取"想读"书籍数据
    console.log('📚 测试2: 获取书籍数据("想读"状态)...');
    
    const wishCommand = `npm run test:douban-wish "${userCookie}" "${userId}"`;
    
    try {
      const { stdout, stderr } = await execAsync(wishCommand);
      console.log('✅ "想读"书籍数据获取成功!');
      console.log('\n📚 想读书籍数据结果:');
      console.log(stdout);
      if (stderr) {
        console.log('⚠️ 警告信息:', stderr);
      }
    } catch (error: any) {
      console.log('❌ "想读"书籍数据获取失败:', error.message);
    }

    console.log('\n' + '='.repeat(50));

    // 测试3: 获取电影数据
    console.log('🎬 测试3: 获取电影数据...');
    
    const movieCommand = `npm run test:douban-movie-opt "${userCookie}" "${userId}"`;
    
    try {
      const { stdout, stderr } = await execAsync(movieCommand);
      console.log('✅ 电影数据获取成功!');
      console.log('\n🎬 电影数据结果:');
      console.log(stdout);
      if (stderr) {
        console.log('⚠️ 警告信息:', stderr);
      }
    } catch (error: any) {
      console.log('❌ 电影数据获取失败:', error.message);
    }

  } catch (error: any) {
    console.error('💥 测试过程异常:', error.message);
  }

  console.log('\n🎯 测试完成');
  console.log('============');
  console.log('💡 如果数据获取成功，接下来我们将使用这些真实数据同步到飞书表格');
  console.log('📊 数据将包含您的真实评分、标签、备注等个人信息');
}

if (require.main === module) {
  testRealDoubanData()
    .then(() => {
      console.log('\n🎉 真实数据测试完成!');
    })
    .catch((error) => {
      console.error('\n💥 测试异常:', error);
    });
}