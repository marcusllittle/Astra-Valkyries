/**
 * LeaderboardScreen — Display top players from the HavnAI leaderboard API.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { fetchLeaderboard, type LeaderboardEntry } from "../lib/havnApi";

export default function LeaderboardScreen() {
  const navigate = useNavigate();
  const wallet = useWallet();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLeaderboard(50)
      .then(({ entries: nextEntries, offline: isOffline }) => {
        if (!cancelled) {
          setEntries(nextEntries);
          setOffline(isOffline);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Unable to load leaderboard right now.");
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const playerRank = wallet.address
    ? entries.findIndex((e) => e.wallet.toLowerCase() === wallet.address!.toLowerCase())
    : -1;

  return (
    <div className="screen leaderboard-screen">
      <div className="leaderboard-header">
        <button className="btn btn-small" onClick={() => navigate("/")}>
          Back
        </button>
        <h2 className="leaderboard-title">Leaderboard</h2>
        <div style={{ width: 60 }} />
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
        <div className="leaderboard-empty">No entries yet. Play to be the first!</div>
      ) : (
        <>
          {playerRank >= 0 && (
            <div className="leaderboard-player-rank">
              Your rank: <strong>#{playerRank + 1}</strong> — Score: {entries[playerRank].best_score.toLocaleString()}
            </div>
          )}
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
                        {entry.rank <= 3 ? (
                          <span className={`rank-medal rank-${entry.rank}`}>
                            {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"}
                          </span>
                        ) : (
                          entry.rank
                        )}
                      </td>
                      <td className="leaderboard-wallet">{entry.wallet_short}</td>
                      <td className="leaderboard-score">{entry.best_score.toLocaleString()}</td>
                      <td className="leaderboard-runs">{entry.total_runs}</td>
                      <td className="leaderboard-earned">{entry.total_earned}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
