import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DoubanService } from './douban.service';
import { DoubanController } from './douban.controller';
import { CryptoModule } from '../common/crypto/crypto.module';
import { CookieManagerService } from './services/cookie-manager.service';
import { AntiSpiderService } from './services/anti-spider.service';
import { HtmlParserService } from './services/html-parser.service';
import { BookScraperService } from './services/book-scraper.service';
import { MovieScraperService } from './services/movie-scraper.service';
import { DataTransformationService } from './services/data-transformation.service';

/**
 * 豆瓣模块 - 豆瓣数据抓取
 *
 * 功能:
 * - 反爬虫策略实现
 * - Cookie认证管理
 * - 数据抓取和解析
 * - 人机验证处理
 */
@Module({
  imports: [ConfigModule, CryptoModule],
  providers: [
    DoubanService,
    CookieManagerService,
    AntiSpiderService,
    HtmlParserService,
    BookScraperService,
    MovieScraperService,
    DataTransformationService,
  ],
  controllers: [DoubanController],
  exports: [
    DoubanService,
    CookieManagerService,
    AntiSpiderService,
    HtmlParserService,
    BookScraperService,
    MovieScraperService,
    DataTransformationService,
  ],
})
export class DoubanModule {}
