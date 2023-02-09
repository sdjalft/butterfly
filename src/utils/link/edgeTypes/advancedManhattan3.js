import _ from 'lodash';
import {getAvoidObstaclesInfo} from './_utils';

const MAJOR_INTERVAL = 30;
const MINOR_INTERVAL = 0;
const MINOR_MAIN_INTERVAL = 20;
const OUTSIDE_BORDER = 50;

const CROWD_SCORE = 1000;
const POS_SCORE = 10;

const drawAdvancedManhattan3 = (sourceEndpoint, targetEndpoint) => {
  const {nodes} = getAvoidObstaclesInfo();
  // TODO 换向
  const rankDir = 'RL' === 'RL' ? -1 : 1;
  let piecesArray = [];
  // 画布切片
  const canvasPieces = () => {
    let funcPiecesArray = [];
    let minX, minY, maxX, maxY;
    nodes.forEach(n => {
      if (n.left < minX || !minX) {
        minX = n.left;
      }
      if (n.top < minY || !minY) {
        minY = n.top;
      }
      if (n.left + n.width > maxX || !maxX) {
        maxX = n.left + n.width;
      }
      if (n.top + n.height > maxY || !maxY) {
        maxY = n.top + n.height;
      }
    });
    minX = minX - OUTSIDE_BORDER;
    minY = minY - OUTSIDE_BORDER;
    maxX = maxX + OUTSIDE_BORDER;
    maxY = maxY + OUTSIDE_BORDER;

    const resultArray = [];
    const resultArrayNodes = [];
    for (let n of nodes.sort((a, b) => a.left - b.left)) {
      const leftX = n.left;
      const rightX = n.left + n.width;
      let newFlag = true;
      for (let cc = 0; cc < resultArray.length; cc++) {
        const originLeft = resultArray[cc][0];
        const originRight = resultArray[cc][1];
        // 节点与坐标无交错关系，继续检测
        if (leftX >= originRight || rightX <= originLeft) {
          continue;
        }
        newFlag = false;
        resultArrayNodes[cc].push(n);
        // 节点被坐标包围
        if (leftX >= originLeft && rightX <= originRight) {
          break;
        }
        // 节点交错
        if (leftX < originLeft) {
          resultArray[cc][0] = leftX;
        }
        if (rightX > originRight) {
          resultArray[cc][1] = rightX;
        }
      }
      if (newFlag) {
        resultArray.push([leftX - MAJOR_INTERVAL, rightX + MAJOR_INTERVAL]);
        resultArrayNodes.push([n]);
      }
    }

    for (let cc = 0; cc < resultArray.length; cc++) {
      resultArrayNodes[cc].sort((a, b) => a.top - b.top);

      const intervals = [{
        area: [-Infinity, resultArrayNodes[cc][0].top],
        downcrowd: []
      }];
      for (let dd = 0; dd < resultArrayNodes[cc].length - 1; dd++) {
        intervals.push({
          area: [resultArrayNodes[cc][dd].top + resultArrayNodes[cc][dd].height, resultArrayNodes[cc][dd + 1].top],
          upcrowd: [],
          downcrowd: [],
          fulltime: 0
        });
      }
      intervals.push({
        area: [resultArrayNodes[cc][resultArrayNodes[cc].length - 1].top + resultArrayNodes[cc][resultArrayNodes[cc].length - 1].height, Infinity],
        upcrowd: []
      })

      funcPiecesArray.push({
        area: resultArray[cc],
        intervals
      });
    }

    funcPiecesArray.sort((a, b) => a.area[0] - b.area[0])

    return funcPiecesArray
  };

  const getEndpointIdx = (endpoint) => {
    // TODO 宽高计算正确后换回来
    const x = endpoint.pos[0];
    for (let cc = 0; cc < piecesArray.length; cc++) {
      if (piecesArray[cc].area[0] >= x) {
        return cc - 1;
      }
    }
    return piecesArray.length - 1;
    console.log('-----------------------');
    console.log(endpoint);
    console.log(piecesArray);
    throw Error('未找到Endpoint位置!')
  }

  if (window.piecesArray) {
    piecesArray = window.piecesArray;
  } else {
    piecesArray = canvasPieces(); 
    window.piecesArray = piecesArray;
  } 
  // 判断sourceEndpoint，targetEndpoint在哪个区域里
  const sourceIdx = getEndpointIdx(sourceEndpoint);
  const targetIdx = getEndpointIdx(targetEndpoint);

  const edgeDir = targetEndpoint.pos[0] - sourceEndpoint.pos[0];
  // TODO 换向
  let minorRes = [[sourceEndpoint.pos[0], sourceEndpoint.pos[1]], [sourceEndpoint.pos[0] + MAJOR_INTERVAL * rankDir, sourceEndpoint.pos[1]]];
  const regress = (targetIdx - sourceIdx) / Math.abs(targetIdx - sourceIdx);
  const calcWillPos = (cc) => {
    let willPos;
    // 对于各个间隙进行评分，选择最佳评分插入
    const currIdx = sourceIdx + cc;
    const startPoint = minorRes[minorRes.length - 1];
    const verticalInterval = targetEndpoint.pos[0] - startPoint[0];
    const intervals = piecesArray[currIdx].intervals;
    // 如果主方向没有节点，直接通过
    let majorDirBorderFlag = false;
    for (let cc = 0; cc < intervals.length; cc++) {
      if (intervals[cc].area[0] >= startPoint[1] || intervals[cc].area[1] <= startPoint[1]) {
        continue;
      } else {
        majorDirBorderFlag = true;
        break;
      }
    }
    if (!majorDirBorderFlag) {
      const getIntervalScore = (interval) => {
        let score = 0;
        const size = Math.floor((interval.area[1] - interval.area[0]) / MINOR_INTERVAL) + 1;
        // 容积占比评分
        score += ((_.get(interval, 'upcrowd.length', 0) + _.get(interval, 'downcrowd.length', 0))/ size + _.get(interval, 'fulltime', 0)) * CROWD_SCORE;
        // 间隙位置评分
        let greatPos;
          // TODO 可以细化些，先找到最合适的坐标
        greatPos = ((interval.area[0] === -Infinity ? interval.area[1] : interval.area[0]) + 
          (interval.area[1] === Infinity ? interval.area[0] : interval.area[1])) / 2;
        score += (Math.abs(greatPos - startPoint[1]) + Math.abs(greatPos - targetEndpoint.pos[1])
          - Math.abs(verticalInterval)) * POS_SCORE;
        return score;
      }
      let minScore = Infinity;
      let minFlag = -1;
      for (let cc = 0; cc < intervals.length; cc++) {
        const score = getIntervalScore(intervals[cc]);
        if (minScore > score) {
          minScore = score;
          minFlag = cc;
        }
      }
      // 找到最佳评分间隙，插入
      const bestInterval = intervals[minFlag];
      if (startPoint[1] > bestInterval.area[1]) {
        const crowd = bestInterval.downcrowd;
        willPos = crowd.length === 0 ? bestInterval.area[1] - MINOR_INTERVAL : crowd[crowd.length - 1].top - MINOR_INTERVAL;
        if (bestInterval.upcrowd) {
          if ((bestInterval.upcrowd.length === 0 && willPos <= bestInterval.area[0]) ||
            (bestInterval.upcrowd.length > 0 && willPos <= bestInterval.upcrowd[bestInterval.upcrowd.length - 1].top)) {
            // 清空数据，fulltime增加
            bestInterval.fulltime += 1;
            bestInterval.upcrowd = [];
            bestInterval.downcrowd = [];
            willPos = bestInterval.area[1] - MINOR_INTERVAL;
          }
        }
        bestInterval.downcrowd.push({
          top: willPos,
          majorInterval: MAJOR_INTERVAL
        });
        willPos -= MINOR_MAIN_INTERVAL;
      } else {
        const crowd = bestInterval.upcrowd;
        willPos = crowd.length === 0 ? bestInterval.area[0] + MINOR_INTERVAL : crowd[crowd.length - 1].top + MINOR_INTERVAL;
        if (bestInterval.downcrowd) {
          if ((bestInterval.downcrowd.length === 0 && willPos >= bestInterval.area[1]) ||
            (bestInterval.downcrowd.length > 0 && willPos >= bestInterval.downcrowd[bestInterval.downcrowd.length - 1].top)) {
            // 清空数据，fulltime增加
            bestInterval.fulltime += 1;
            bestInterval.upcrowd = [];
            bestInterval.downcrowd = [];
            willPos = bestInterval.area[0] + MINOR_INTERVAL;
          }
        }
        bestInterval.upcrowd.push({
          top: willPos,
          majorInterval: MAJOR_INTERVAL
        });
        willPos += MINOR_MAIN_INTERVAL;
      }
    } else {
      willPos = startPoint[1];
    }

    verticalInterval > 0 && minorRes.push([piecesArray[currIdx].area[0], willPos]);
    minorRes.push([piecesArray[currIdx].area[1], willPos]);
    verticalInterval <= 0 && minorRes.push([piecesArray[currIdx].area[0], willPos]);
  };

  for (let cc = 0; cc !== targetIdx - sourceIdx; cc += regress) {
    // 寻找合适的间隙将线插进去，逆向线需要同向判断
    if (cc === 0 && edgeDir * rankDir >= 0) {
      continue;
    }
    
    calcWillPos(cc);
  }

  // 逆向需要多走一格
  if (edgeDir * rankDir < 0) {
    calcWillPos(targetIdx - sourceIdx);
  }

  minorRes = minorRes.concat([[targetEndpoint.pos[0] - MAJOR_INTERVAL * rankDir, targetEndpoint.pos[1]], [targetEndpoint.pos[0], targetEndpoint.pos[1]]]);

  // 线条柔化，优先副方向
  let path = [minorRes[0]];
  for (let cc = 0; cc < minorRes.length - 1; cc++) {
    // TODO 换向
    if (minorRes[cc][1] !== minorRes[cc + 1][1]) {
      path.push([minorRes[cc][0], minorRes[cc + 1][1]]);
    }
    path.push(minorRes[cc + 1]);
  }

  // 线路简化，如果耗费时间长就不要，之后转变为线
  let truePath = [];
  for (let cc = 0; cc < path.length; cc++) {
    const prevPath = path[cc - 1];
    const prevPath2 = path[cc - 2];
    if (prevPath && prevPath2 && ((prevPath[0] === prevPath2[0] && prevPath[0] === path[cc][0]) ||
      (prevPath[1] === prevPath2[1] && prevPath[1] === path[cc][1]))) {
      truePath.pop();
    }
    truePath.push(path[cc]);
  }

  // 线路绘制
  let result = `M${truePath[0][0]} ${truePath[0][1]}`;
  for (let cc = 1; cc < truePath.length; cc++) {
    result += `L${truePath[cc][0]} ${truePath[cc][1]}`;
  }

  return result;
};

export default drawAdvancedManhattan3;
