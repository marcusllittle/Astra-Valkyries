/**
 * LeaderboardScreen — Enhanced display of top players from the HavnAI leaderboard API.
 * Features: player rank highlight, stats summary, refresh, offline mode, empty state.
 */

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { useGame } from "../context/GameContext";
import { fetchLeaderboard, fetchPlayerStats, type LeaderboardEntry, type PlayerStats } from "../lib/havnApi";

const SHMUP_TRACK_ID = "shmup_arcade";

export default function LeaderboardScreen() {
  const navigate = useNavigate();
  const wallet = useWallet();
  const { save } = useGame();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [lb, stats] = await Promise.allSettled([
        fetchLeaderboard(50),
        wallet.address ? fetchPlayerStats(wallet.address) : Promise.reject("no wallet"),
      ]);
      if (lb.status === "fulfilled") {
        setEntries(lb.value.entries);
        setOffline(lb.value.offline);
      } else {
        setError("Failed to load leaderboard");
      }
      if (stats.status === "fulfilled") setPlayerStats(stats.value);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }, [wallet.address]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const playerRank = wallet.address
    ? entries.findIndex((e) => e.wallet.toLowerCase() === wallet.address!.toLowerCase())
    : -1;

  const localBest = save.highScores[SHMUP_TRACK_ID] ?? 0;

  return (
    <div className="screen leaderboard-screen premium-screen leaderboard-screen-premium">
      <div className="leaderboard-key-art" aria-hidden="true" />
      <div className="leaderboard-header">
        <button className="btn btn-small" onClick={() => navigate("/")}>
          Back
        </button>
        <h2 className="leaderboard-title">Leaderboard</h2>
        <button
          className="btn btn-small"
          onClick={loadData}
          disabled={loading}
        >
          {loading ? "..." : "Refresh"}
        </button>
      </div>

      {/* Player summary card */}
      <div className="lb-summary panel-surface">
        <div className="lb-summary-grid">
          <div className="lb-summary-stat">
            <span className="lb-summary-label">Your Rank</span>
            <span className="lb-summary-value">
              {playerRank >= 0 ? `#${playerRank + 1}` : "—"}
            </span>
          </div>
          <div className="lb-summary-stat">
            <span className="lb-summary-label">Best Score</span>
            <span className="lb-summary-value">
              {playerStats?.best_score?.toLocaleString() ?? localBest.toLocaleString()}
            </span>
          </div>
          <div className="lb-summary-stat">
            <span className="lb-summary-label">Total Runs</span>
            <span className="lb-summary-value">
              {playerStats?.total_runs?.toLocaleString() ?? "—"}
            </span>
          </div>
          <div className="lb-summary-stat">
            <span className="lb-summary-label">Total Earned</span>
            <span className="lb-summary-value">
              {playerStats?.total_earned?.toLocaleString() ?? "—"}
            </span>
          </div>
        </div>
        {wallet.status !== "connected" && (
          <p className="lb-summary-hint">Connect wallet to track your rank and earn HavnAI credits</p>
        )}
        {playerStats && playerStats.daily_cap > 0 && (
          <div className="lb-daily-progress">
            <span className="lb-daily-label">Daily Earnings</span>
            <div className="lb-daily-track">
              <div
                className="lb-daily-fill"
                style={{ width: `${Math.min(100, (playerStats.daily_earned / playerStats.daily_cap) * 100)}%` }}
              />
            </div>
            <span className="lb-daily-text">
              {playerStats.daily_earned} / {playerStats.daily_cap}
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="leaderboard-loading">Loading rankings...</div>
      ) : error ? (
        <div className="leaderboard-error">{error}</div>
      ) : offline ? (
        <div className="leaderboard-empty">
          Online leaderboard unavailable. The game is running in local/offline mode.
        </div>
      ) : entries.length === 0 ? (
        <div className="leaderboard-empty">
          <p>No entries yet.</p>
          <p>Play to be the first on the board!</p>
        </div>
      ) : (
        <div className="leaderboard-table-wrap">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>Best Score</th>
                <th>Runs</th>
                <th>Earned</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const isPlayer = wallet.address
                  ? entry.wallet.toLowerCase() === wallet.address.toLowerCase()
                  : false;
                return (
                  <tr
                    key={entry.rank}
                    className={`leaderboard-row ${isPlayer ? "leaderboard-row-self" : ""} ${entry.rank <= 3 ? "leaderboard-row-top" : ""}`}
                  >
                    <td className="leaderboard-rank">
                      {entry.rank === 1 ? (
                        <span className="rank-medal rank-1">1st</span>
                      ) : entry.rank === 2 ? (
                        <span className="rank-medal rank-2">2nd</span>
                      ) : entry.rank === 3 ? (
                        <span className="rank-medal rank-3">3rd</span>
                      ) : (
                        entry.rank
                      )}
                    </td>
                    <td className="leaderboard-wallet">
                      {entry.wallet_short}
                      {isPlayer && <span className="lb-you-badge">You</span>}
                    </td>
                    <td className="leaderboard-score">{entry.best_score.toLocaleString()}</td>
                    <td className="leaderboard-runs">{entry.total_runs}</td>
                    <td className="leaderboard-earned">{entry.total_earned}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
