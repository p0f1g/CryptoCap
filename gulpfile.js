import * as fs from 'fs';
import browserSync from 'browser-sync';
import gulp from 'gulp';
import del from 'del';
import autoprefixer from 'autoprefixer';
import webpackStream from 'webpack-stream';
import newer from 'gulp-newer';
import gulpif from 'gulp-if';
import imagemin from 'gulp-imagemin';
import postcss from 'gulp-postcss';
import pug from 'gulp-pug';
import plumber from 'gulp-plumber';
import csso from 'postcss-csso';
import sortMediaQueries from 'postcss-sort-media-queries';
import dartSass from 'sass';
import gulpSass from 'gulp-sass';
import svgSprite from 'gulp-svg-sprite';

const { series, parallel, src, dest, watch } = gulp;
const bs = browserSync.create();
const sass = gulpSass(dartSass);
const doNotEditMsg =
  '\n ВНИМАНИЕ! Этот файл генерируется автоматически.\n Любые изменения этого файла будут потеряны при следующей компиляции.\n\n';

const mode = process.env.MODE || 'development';
const dir = {
  src: 'src/',
  build: 'build/',
  components: 'src/components/',
};

const postCssPlugins = [
  sortMediaQueries({
    sort: 'mobile-first',
  }),
  autoprefixer(),
  csso({
    restructure: false,
  }),
];

export function compileSass() {
  const fileList = [`${dir.src}/styles/main.scss`];
  return src(fileList, { sourcemaps: true })
    .pipe(sass().on('error', sass.logError))
    .pipe(gulpif(mode !== 'development', postcss(postCssPlugins)))
    .pipe(
      dest(`${dir.build}/css`, {
        sourcemaps: mode === 'development' ? '.' : false,
      })
    )
    .pipe(bs.stream());
}

export function compilePug() {
  const fileList = [`${dir.src}pages/**/*.pug`];

  return src(fileList)
    .pipe(
      plumber({
        errorHandler(err) {
          console.log(err.message);
          this.emit('end');
        },
      })
    )
    .pipe(pug())
    .pipe(dest(dir.build));
}

export function images() {
  return src(`${dir.src}/img/**/*.{jpg,jpeg,png,gif,svg,webp,avif}`)
    .pipe(newer(`${dir.build}/images`))
    .pipe(
      gulpif(
        mode !== 'development',
        imagemin({
          progressive: true,
          svgoPlugins: [{ removeViewBox: false }],
          interlaced: true,
          optimizationLevel: 3, // 0 to 7
        })
      )
    )
    .pipe(dest(`${dir.build}/images`));
}

export function clearBuildDir() {
  return del([`${dir.build}**/*`]);
}

export function copyFonts() {
  return src(`${dir.src}/fonts/*.{woff,woff2}`).pipe(
    dest(`${dir.build}/fonts`)
  );
}

export function buildJs() {
  return src(`${dir.src}js/main.js`)
    .pipe(
      webpackStream({
        mode,
        devtool: mode === 'development' ? 'inline-source-map' : false,
        output: {
          filename: '[name].js',
        },
        module: {
          rules: [
            {
              test: /\.js$/,
              exclude: /node_modules/,
              use: {
                loader: 'babel-loader',
                options: {
                  presets: [['@babel/preset-env', { targets: 'defaults' }]],
                },
              },
            },
          ],
        },
      })
    )
    .pipe(dest(`${dir.build}js`));
}

export function generateSvgSprite() {
  return src(`${dir.src}svg-icons/*.svg`)
    .pipe(
      svgSprite({
        mode: {
          inline: true,
          symbol: {
            dest: '.',
            sprite: 'sprite.svg',
          },
        },
        shape: {
          transform: [
            {
              svgo: {
                plugins: [
                  { removeXMLNS: true },
                  { convertPathData: true },
                  { removeViewBox: false },
                ],
              },
            },
          ],
        },
        svg: {
          rootAttributes: {
            style: 'display: none;',
            'aria-hidden': true,
          },
          xmlDeclaration: false,
          doctypeDeclaration: false,
        },
      })
    )
    .pipe(dest(`${dir.src}img/svg`));
}

function reload(done) {
  bs.reload();
  done();
}

/**
 * Проверка существования файла или папки
 * @param  {string} path      Путь до файла или папки
 * @return {boolean}
 */
function fileExist(filepath) {
  let flag = true;
  try {
    fs.accessSync(filepath, fs.F_OK);
  } catch (e) {
    flag = false;
  }
  return flag;
}

/**
 * Получение всех названий поддиректорий, содержащих файл указанного расширения, совпадающий по имени с поддиректорией
 * @param  {string} ext    Расширение файлов, которое проверяется
 * @return {array}         Массив из имён блоков
 */
function getDirectories(ext) {
  const source = dir.components;
  const res = fs
    .readdirSync(source)
    .filter((item) => fs.lstatSync(source + item).isDirectory())
    .filter((item) => fileExist(`${source + item}/${item}.${ext}`));
  return res;
}

function writePugMixinsFile(cb) {
  const allBlocksWithPugFiles = getDirectories('pug');
  let pugMixins = `//-${doNotEditMsg.replace(/\n /gm, '\n  ')}`;
  allBlocksWithPugFiles.forEach((blockName) => {
    pugMixins += `include ${dir.components.replace(
      dir.src,
      '../'
    )}${blockName}/${blockName}.pug\n`;
  });
  fs.writeFileSync(`${dir.src}pug/mixins.pug`, pugMixins);
  cb();
}

function serve() {
  bs.init({
    server: dir.build,
    port: 8080,
    open: false,
    notify: false,
  });

  watch(
    [`${dir.src}pages/**/*.pug`],
    { events: ['change', 'add'], delay: 100 },
    series(compilePug, reload)
  );

  watch(
    [`${dir.components}**/*.pug`],
    { events: ['change'], delay: 100 },
    series(compilePug, reload)
  );

  watch(
    [`${dir.components}**/*.pug`],
    { events: ['add'], delay: 100 },
    series(writePugMixinsFile, compilePug, reload)
  );

  watch(
    [`${dir.components}**/*.pug`],
    { events: ['unlink'], delay: 100 },
    writePugMixinsFile
  );

  watch(
    [`${dir.src}pug/**/*.pug`, `!${dir.src}pug/mixins.pug`],
    { delay: 100 },
    series(compilePug, reload)
  );

  watch(
    [`${dir.src}styles/**/*.scss`, `${dir.components}**/*.scss`],
    { events: ['all'], delay: 100 },
    compileSass
  );

  watch(
    [`${dir.src}js/**/*.js`],
    { events: ['all'], delay: 100 },
    series(buildJs, reload)
  );

  watch(
    [`${dir.src}img/**/*.{jpg,jpeg,png,gif,svg,webp,avif}`],
    { events: ['all'], delay: 100 },
    series(images, reload)
  );

  watch(
    [`${dir.src}svg-icons/*.svg`],
    { events: ['all'], delay: 100 },
    generateSvgSprite
  );
}

export const build = series(
  parallel(clearBuildDir, writePugMixinsFile),
  parallel(compileSass, buildJs, copyFonts, images, compilePug)
);

export default series(build, serve);
