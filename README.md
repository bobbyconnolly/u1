# U(1) XY Model Simulation 🌀

This project is an interactive web-based simulation visualizing the **2D XY model**, a fundamental concept in statistical physics used to explore systems with **U(1) symmetry**. It demonstrates emergent phenomena like **phase transitions**, **spontaneous symmetry breaking**, and the formation of **topological defects (vortices)**.

Built with TypeScript and rendered using the HTML Canvas API.

---

## Live Simulation

**Explore the simulation here:** 👉 [**https://bobbyconnolly.com/u1-simulation/**](https://bobbyconnolly.com/u1-simulation/)

---

## What It Shows

* **U(1) Field:** The grid represents a field where each point has a phase (an angle, visualized as an arrow).
* **Energy Minimization:** Arrows interact with their neighbors, trying to align to minimize the system's energy. This is achieved by correctly calculating the average direction using vector addition, respecting the circular nature of the phase.
* **Ordering from Chaos:** Watch how a randomly initialized grid spontaneously forms ordered domains.
* **Temperature:** Introduce randomness ("heat") to see how it disrupts order and helps "melt" defects.
* **Vortices:** Observe stable, swirling patterns (vortices and anti-vortices) that emerge as topological defects during the ordering process. These are analogous to particle/anti-particle pairs. 🌪️
* **Global Symmetry:** Use the "Hold Rotate" button (↻) to apply a uniform rotation to all arrows. Notice how the relative alignment (and thus the physics) remains unchanged, demonstrating global U(1) symmetry.

---

## Interactive Features

* **Paint:** Click/Tap and drag to manually set the direction of arrows.
* **Flip Spin (Explosion):** Quickly click (desktop) or tap-and-hold for 0.5s (mobile) to flip the phase of arrows in a small area, creating a disturbance.
* **Controls:** Adjust simulation speed and temperature.
* **Restart:** Reset the grid to a random state.
* **Rotate:** Hold the (↻) button to apply a continuous global phase rotation.
* **Info Modal:** Click the 'i' button for an explanation of the physics concepts and simulation details.
* **Order Parameter:** The number in the top-right corner (%) indicates the degree of global alignment (00% = chaos, 99% = ordered).

---

## What It *Doesn't* Show (Gauge Symmetry)

This is an **XY Model**, not a full **Lattice Gauge Theory**. It lacks the strict *local* conservation rules (gauge symmetry) enforced by a gauge field and mediated by gauge bosons (like photons 💡). The temperature implementation via random kicks, for example, violates local phase conservation.

---

## Running Locally

This project uses [Vite](https://vitejs.dev/) with TypeScript.

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd <repo-name>
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Run the development server:**
    ```bash
    npm run dev
    ```
4.  Open your browser to the local address provided (usually `http://localhost:5173`).

---

Find the source code on [GitHub](https://github.com/bobbyconnolly/u1).