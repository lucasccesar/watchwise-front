export interface SeasonEpisodeProgressInput {
  episodeNumber: number | null;
  releaseDate: string | null;
  watchStatus: string | null;
}

export function getSeasonEpisodeProgress(
  episodes: readonly SeasonEpisodeProgressInput[],
  expectedEpisodeCount: number,
  today: string,
): { watchedEpisodeCount: number; releasedEpisodeCount: number } | null {
  if (expectedEpisodeCount < 0 || episodes.length !== expectedEpisodeCount
      || episodes.some((episode) => episode.episodeNumber == null || !episode.releaseDate)) {
    return null;
  }

  const released = episodes.filter((episode) => episode.releaseDate! <= today);
  return {
    watchedEpisodeCount: released.filter((episode) => episode.watchStatus === 'WATCHED').length,
    releasedEpisodeCount: released.length,
  };
}

export function isSeasonWatched(
  watchStatus: string | null | undefined,
  watchedEpisodeCount: number | null | undefined,
  releasedEpisodeCount: number | null | undefined,
): boolean {
  if (watchedEpisodeCount != null && releasedEpisodeCount != null) {
    return releasedEpisodeCount > 0 && watchedEpisodeCount >= releasedEpisodeCount;
  }
  return watchStatus === 'WATCHED';
}

export function hasSeasonCompletion(
  completions: readonly { content: { type: string; seasonNumber: number | null } }[],
  seasonNumber: number,
): boolean {
  return completions.some((completion) =>
    completion.content.type === 'SEASON' && completion.content.seasonNumber === seasonNumber,
  );
}
