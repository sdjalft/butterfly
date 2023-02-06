import _ from 'lodash';
import {getOriginCanvas, getAvoidObstaclesInfo} from './_utils';

const MIN_DIRECTION_INTEVAL = 10;
const OUTSIDE_BORDER = 20;

const EDGE_MASK = 500;
const CROSS_BONUS = 0.5;
const CORNER_BONUS = 2;
// 同向优势
const SAME_DIRECTION_PROFILL_MASK = 5;
// 非主方向剪枝
const WRONG_DIRECTION_MASK = -100;

const drawAdvancedManhattan2 = (sourceEndpoint, targetEndpoint) => {
  const canvas = getOriginCanvas();
  const {nodes} = getAvoidObstaclesInfo();
  const rankDir = 'RL';
  // 画布切片
  const canvasPieces = () => {
    let funcPiecesArray = [];
    let minX, minY, maxX, maxY;
    console.log(nodes);
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
    // TODO 添加纵向版本
    if (rankDir === 'LR' || rankDir === 'RL') {
      const majorCounts = (maxX - minX) / MIN_DIRECTION_INTEVAL;
      const minorCounts = (maxY - minY) / MIN_DIRECTION_INTEVAL;
      for (let cc = 0; cc < majorCounts; cc++) {
        const tmp = [];
        for (let dd = 0; dd < minorCounts; dd++) {
          let isCoverByNode = false;
          for (let node of nodes) {
            if (((node.left - ((cc + 1) * MIN_DIRECTION_INTEVAL + minX)) * (node.left + node.width - (cc * MIN_DIRECTION_INTEVAL + minX)) < 0) &&
              (node.top - ((dd + 1) * MIN_DIRECTION_INTEVAL + minY)) * (node.top + node.height - (dd * MIN_DIRECTION_INTEVAL + minY)) < 0) {
                isCoverByNode = true;
                break;
              }
          }
          tmp.push({
            left: cc * MIN_DIRECTION_INTEVAL + minX,
            top: dd * MIN_DIRECTION_INTEVAL + minY,
            leftIndex: cc,
            topIndex: dd,
            bounding: isCoverByNode ? 10000 : 10
          });
        }
        resultArray.push(tmp);
      } 
    }
    funcPiecesArray = resultArray;
    // if (rankDir === 'LR' || rankDir === 'RL') {
    //   const minorCounts = (maxY - minY) / MINOR_PIECES_SIZE;
    //   // 获取节点纵向无限延伸后占用纵向空间坐标
    //   for (let n of nodes.sort((a, b) => a.left - b.left)) {
    //     const leftX = n.left;
    //     const rightX = n.left + n.width;
    //     let newFlag = true;
    //     for (let cc = 0; cc < resultArray.length; cc++) {
    //       const originLeft = resultArray[cc][0];
    //       const originRight = resultArray[cc][1];
    //       // 节点与坐标无交错关系，继续检测
    //       if (leftX >= originRight || rightX <= originLeft) {
    //         continue;
    //       }
    //       newFlag = false;
    //       resultArrayNodes[cc].push(n);
    //       // 节点被坐标包围
    //       if (leftX >= originLeft && rightX <= originRight) {
    //         break;
    //       }
    //       // 节点交错
    //       if (leftX < originLeft) {
    //         resultArray[cc][0] = leftX;
    //       }
    //       if (rightX > originRight) {
    //         resultArray[cc][1] = rightX;
    //       }
    //     }
    //     if (newFlag) {
    //       resultArray.push([leftX, rightX]);
    //       resultArrayNodes.push([n]);
    //     }
    //   }

    //   resultArray.sort((a, b) => {
    //     return a[0] >= b[0];
    //   });

    //   // 根据宽度切片
    //   for (let cc = 0; cc < resultArray.length; cc++) {
    //     const piecesInterval1 = [];
    //     const piecesInterval2 = [];
    //     const piecesSelf = [];
    //     const piecesRight = [];
    //     for (let dd = 0; dd < minorCounts; dd++) {
    //       const currY = minY + dd * MINOR_PIECES_SIZE;
    //       // 被盖住的节点赋予高障碍值
    //       let isCoverByNode = false;
    //       for (let ee of resultArrayNodes[cc]) {
    //         if ((currY + MINOR_PIECES_SIZE) < ee.top || (currY) > ee.top + ee.height + MINOR_PIECES_SIZE) {
    //           continue;
    //         }
    //         isCoverByNode = true;
    //         break;
    //       }
    //       piecesInterval1.push(new Pieces({
    //         left: resultArray[cc][0] - MIN_DIRECTION_INTEVAL,
    //         top: currY,
    //         leftIndex: cc * 4,
    //         topIndex: dd,
    //         bounding: 1
    //       }));
    //       piecesSelf.push(new Pieces({
    //         left: resultArray[cc][0],
    //         top: currY,
    //         leftIndex: cc * 4 + 1,
    //         topIndex: dd,
    //         bounding: isCoverByNode ? 2000 : 1
    //       }));
    //       piecesInterval2.push(new Pieces({
    //         left: resultArray[cc][1],
    //         top: currY,
    //         leftIndex: cc * 4 + 2,
    //         topIndex: dd,
    //         bounding: 1
    //       }));
    //       piecesRight.push(new Pieces({
    //         left: resultArray[cc][1] + MIN_DIRECTION_INTEVAL,
    //         top: currY,
    //         leftIndex: cc * 4 + 3,
    //         topIndex: dd,
    //         bounding: 1
    //       }));
    //     }
    //     funcPiecesArray = funcPiecesArray.concat([piecesInterval1, piecesSelf, piecesInterval2, piecesRight]);
    //   }
    // }
    return funcPiecesArray;
  };

  // 路径简化
  const simplifyResult = (resultPath) => {
    let result = [];
    for (let cc = 0; cc < resultPath.length; cc++) {
      const prevPath = result[result.length - 1];
      const prevPath2 = result[result.length - 2];
      if ((_.get(prevPath, 'left') === _.get(prevPath2, 'left') &&
        _.get(prevPath, 'left') === _.get(resultPath[cc], 'left')) ||
        (_.get(prevPath, 'top') === _.get(prevPath2, 'top') &&
        _.get(prevPath, 'top') === _.get(resultPath[cc], 'top'))) {
        result.pop();
      }
      result.push(resultPath[cc]);
    }
    result = result.map(ele => {
      return [ele.left + MIN_DIRECTION_INTEVAL / 2, ele.top + MIN_DIRECTION_INTEVAL / 2]
    });
    // TODO 换向
    // 修正起始点和终点坐标
    let changeFlag = result[1][1];
    for (let cc = 1; cc < result.length; cc++) {
      if (result[cc][1] === changeFlag) {
        result[cc][1] = result[0][1];
      } else {
        break;
      }
    }
    changeFlag = result[result.length - 2][1];
    for (let cc = result.length - 2; cc >= 0; cc--) {
      if (result[cc][1] === changeFlag) {
        result[cc][1] = result[result.length - 1][1];
      } else {
        break;
      }
    }
    return result;
  }

  // A*寻路
  const edgesAStar = () => {
    const getEndpointPiece = (endpoint) => {
      for (let cc = 0; cc < piecesArray.length; cc++) {
        const endpoint0 = _.get(endpoint, 'pos.0') || endpoint[0];
        const endpoint1 = _.get(endpoint, 'pos.1') || endpoint[1];
        // TODO 换向以及可优化
        if (_.get(piecesArray, `${cc}.0.left`) <= endpoint0 && _.get(piecesArray, `${cc + 1}.0.left`) > endpoint0) {
          for (let dd = 0; dd < piecesArray[cc].length; dd++) {
            if (_.get(piecesArray, `${cc}.${dd}.top`) <= endpoint1 && _.get(piecesArray, `${cc}.${dd + 1}.top`) > endpoint1) {
              return _.get(piecesArray, `${cc}.${dd}`);
            }
          }
        }
      }
      throw Error('未找到endpoint对应的块!');
    };

    const trueSourcePointPiece = getEndpointPiece(sourceEndpoint);
    const trueTargetPointPiece = getEndpointPiece(targetEndpoint);
    const sourcePointPiece = _.get(piecesArray, `${trueSourcePointPiece.leftIndex + 1}.${trueSourcePointPiece.topIndex}`);
    const targetPointPiece = _.get(piecesArray, `${trueTargetPointPiece.leftIndex - 1}.${trueTargetPointPiece.topIndex}`);
    let resultPath = [];
    // TODO 换向
    // 起始射线的方向是确定的
    sourcePointPiece.visited = true;
    // 从IntervalPiece开始计算
    // TODO 剪枝优化
    let edgeQueue = [{
      left: sourcePointPiece.leftIndex,
      top: sourcePointPiece.topIndex,
      value: 0,
      dir: [1, 0]
    }];
    // TODO 换向
    const mainDirection = targetPointPiece.leftIndex - sourcePointPiece.leftIndex;
    while (edgeQueue.length !== 0) {
      const currEdge = edgeQueue.shift();
      const addAStarEdge = (piece, dir) => {
        if (!piece) {
          return;
        }
        if (piece === targetPointPiece) {
          piece.parent = _.get(piecesArray, `${currEdge.left}.${currEdge.top}`);
          return true;
        }
        if (!piece.visited) {
          const isSameDir = dir[0] === currEdge.dir[0] && dir[1] === currEdge.dir[1];
          const isWrongDir = (dir[0] * mainDirection) < 0;
          let edgeBonus = 1;
          if ((dir[0] !== 0 && piece.edgeType === 'horizon') || (dir[1] !== 0 && piece.edgeType === 'vertical')) {
            edgeBonus = CROSS_BONUS;
          } else if (piece.edgeType === 'cross') {
            edgeBonus = CORNER_BONUS;
          }
          edgeQueue.push({
            left: piece.leftIndex,
            top: piece.topIndex,
            value: (piece.bounding * edgeBonus) + currEdge.value - (isSameDir ? SAME_DIRECTION_PROFILL_MASK : 0)
              - (isWrongDir ? WRONG_DIRECTION_MASK : 0),
            dir: dir
          });
          piece.visited = true;
          piece.parent = _.get(piecesArray, `${currEdge.left}.${currEdge.top}`);
        }
      }
      const getResult = () => {
        const getEdgeType = (cc) => {
          if (resultPath[cc - 1].top === resultPath[cc].top && resultPath[cc].top === resultPath[cc + 1].top) {
            return 'horizon';
          }
          if (resultPath[cc - 1].left === resultPath[cc].left && resultPath[cc].left === resultPath[cc + 1].left) {
            return 'vertical';
          }
          return 'cross';
        };

        const setEdgeType = (cc, type) => {
          const prevType = resultPath[cc].edgeType;
          if ((prevType === 'horizon' && type === 'vertical') || (prevType === 'vertical' && type === 'horizon')) {
            resultPath[cc].edgeType = 'cross';
          } else {
            resultPath[cc].edgeType = type;
          }
        }

        let currPiece = targetPointPiece;
        targetPointPiece.bounding = EDGE_MASK;
        resultPath.push(targetPointPiece);
        while (currPiece.parent) {
          currPiece = currPiece.parent;
          currPiece.bounding = EDGE_MASK;
          resultPath.push(currPiece);
        }
        resultPath.push(sourcePointPiece);
        // 有边的格子赋予type值
        for (let cc = 1; cc < resultPath.length - 1; cc++) {
          const type = getEdgeType(cc);
          if (cc === 1) {
            setEdgeType(0, type);
            setEdgeType(1, type);
          } else if (cc === resultPath.length - 2) {
            setEdgeType(resultPath.length - 1, type);
            setEdgeType(resultPath.length - 2, type);
          } else {
            setEdgeType(cc);
          }
        }

        // 添加真实节点，可以不按照piece数据结构走
        // TODO 换向
        resultPath.push({
          left: _.get(sourceEndpoint, 'pos.0') || sourceEndpoint[0],
          top: _.get(sourceEndpoint, 'pos.1') || sourceEndpoint[1]
        });
        resultPath.unshift({
          left: _.get(targetEndpoint, 'pos.0') || targetEndpoint[0],
          top: _.get(targetEndpoint, 'pos.1') || targetEndpoint[1]
        });
      }
      // 四方向广度优先遍历
      const right = addAStarEdge(_.get(piecesArray, `${currEdge.left + 1}.${currEdge.top}`), [1, 0]);
      const up = addAStarEdge(_.get(piecesArray, `${currEdge.left}.${currEdge.top - 1}`), [0, -1]);
      const down = addAStarEdge(_.get(piecesArray, `${currEdge.left}.${currEdge.top + 1}`), [0, 1]);
      const left = addAStarEdge(_.get(piecesArray, `${currEdge.left - 1}.${currEdge.top}`), [-1, 0]);
      if (left || right || up || down) {
        getResult();
        break;
      }

      // 排序，保证为优先队列
      edgeQueue.sort((a, b) => a.value - b.value)
    }

    // 一条边计算完,数据处理
    for (let cc of piecesArray) {
      for (let dd of cc) {
        dd.visited = false;
        dd.parent = undefined;
      }
    }

    return simplifyResult(resultPath.reverse());
  }

  let piecesArray;
  if (window.piecesArray) {
    piecesArray = window.piecesArray;
  } else {
    piecesArray = canvasPieces();
    window.piecesArray = piecesArray;
  }
  // 根据节点寻路
  const result = edgesAStar();
  let path = `M${_.get(result, '0.0')} ${_.get(result, '0.1')}`;
  for (let cc = 1; cc < result.length; cc++) {
    path += `L${_.get(result, `${cc}.0`)} ${_.get(result, `${cc}.1`)} `;
  }
  return path;
}

export default drawAdvancedManhattan2;