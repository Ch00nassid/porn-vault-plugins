import axios from "axios";
import boxen from "boxen";
import cheerio from "cheerio";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import inquirer from "inquirer";
import jimp from "jimp";
import moment from "moment";
import loader from "ora";
import os from "os";
import path from "path";
import readline from "readline";
import semver from "semver";
import yaml from "yaml";
import zod from "zod";
import winston from "winston";

export interface MatchSource {
  _id: string;
  name: string;
}

export interface Matcher {
  /**
   * Filters the matching input items. Sorts them by the longest match
   *
   * @param itemsToMatch - the items to filter by matching
   * @param str - the string to match to
   * @param getInputs - callback to retrieve the strings of an item with which
   * to match against the string
   * @param sortByLongestMatch - if the longest matches should be at the top
   */
  filterMatchingItems: <T extends MatchSource>(
    itemsToMatch: T[],
    str: string,
    getInputs: (matchSource: T) => string[],
    sortByLongestMatch?: boolean
  ) => T[];

  /**
   * Verifies if the item matches a string
   *
   * @param item - the item to match
   * @param str - the string to match to
   * @param getInputs - callback to retrieve the strings of the item with which
   * to match against the string
   */
  isMatchingItem: <T extends MatchSource>(
    item: T,
    str: string,
    getInputs: (matchSource: T) => string[]
  ) => boolean;
}

export interface Context<Data = unknown> {
  // Libraries
  $axios: typeof axios;
  $boxen: typeof boxen;
  $cheerio: typeof cheerio;
  $ffmpeg: typeof ffmpeg;
  $fs: typeof fs;
  $inquirer: typeof inquirer;
  $jimp: typeof jimp;
  $loader: typeof loader;
  $moment: typeof moment;
  $os: typeof os;
  $path: typeof path;
  $readline: typeof readline;
  $semver: typeof semver;
  $yaml: typeof yaml;
  $zod: typeof zod;
  // Injected server functions
  // $config: IConfig, too complicated to add
  $createMarker: (name: string, seconds: number) => Promise<string>;
  $createImage: (url: string, name: string, thumbnail?: boolean) => Promise<string>;
  $createLocalImage: (path: string, name: string, thumbnail?: boolean) => Promise<string>;
  $cwd: string;
  $library: string;
  $getMatcher(type: string, options: unknown): Matcher;
  $log: (...args: any) => void;
  $logger: winston.Logger;
  $formatMessage(message: unknown): string;
  $matcher: Matcher;
  $pluginName: string;
  $pluginPath: string;
  $require: <T = any>(module: string) => T;
  $throw: (error: any) => void;
  $version: string;
  $walk: (opts: {
    dir: string;
    extensions: string[];
    cb: (file: string) => void | Promise<void | unknown> | unknown;
    exclude: string[];
  }) => Promise<void | string>;
  // Plugin
  args?: unknown;
  data: Partial<Data>;
  event: string;
}

export interface CustomFieldsOutput {
  custom?: any;
}

export type DeepPartial<T> = {
  [P in keyof T]: DeepPartial<T[P]> | undefined;
};
