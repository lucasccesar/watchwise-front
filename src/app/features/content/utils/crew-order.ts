import type { MovieCrewMember } from '../data-access/content-api.service';

export type CrewOrderContentType = 'MOVIE' | 'SERIES' | 'SEASON' | 'EPISODE';

const MOVIE_JOB_ORDER = new Map<string, number>([
  ['director', 0],
  ['screenplay', 1],
  ['executive producer', 2],
  ['director of photography', 3],
  ['supervising art director', 4],
  ['production manager', 5],
  ['first assistant director', 6],
]);

const SERIES_JOB_ORDER = new Map<string, number>([
  ['executive producer', 0],
  ['creator', 0],
  ['showrunner', 0],
  ['director', 1],
  ['screenplay', 2],
  ['director of photography', 3],
  ['supervising art director', 4],
  ['production manager', 5],
  ['first assistant director', 6],
]);

export function sortCrewByRole(
  crew: readonly MovieCrewMember[],
  contentType: CrewOrderContentType,
): MovieCrewMember[] {
  const jobOrder = contentType === 'MOVIE' ? MOVIE_JOB_ORDER : SERIES_JOB_ORDER;

  return crew
    .map((person, originalIndex) => {
      const jobs = person.jobs.map((job) => job.trim().toLowerCase());
      const rank = jobs.reduce((bestRank, job) => Math.min(bestRank, jobOrder.get(job) ?? Number.POSITIVE_INFINITY), Number.POSITIVE_INFINITY);
      const isSeriesCreatorOrShowrunner = contentType !== 'MOVIE'
        && jobs.some((job) => job === 'creator' || job === 'showrunner');
      const isExecutiveProducer = jobs.includes('executive producer');

      return {
        person,
        originalIndex,
        rank: isSeriesCreatorOrShowrunner && isExecutiveProducer ? -1 : rank,
      };
    })
    .sort((left, right) => left.rank - right.rank || left.originalIndex - right.originalIndex)
    .map(({ person }) => person);
}
