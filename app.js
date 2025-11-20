// Enhanced admin functionality with smart timetable generation
import { db, collection, addDoc, getDocs, doc, setDoc, updateDoc } from "./firebase.js";
import { authManager } from "./auth.js";

class AdminTimetableManager {
  constructor() {
    this.data = {
      timeslots: [],
      rooms: [],
      teachers: [],
      courses: []
    };
    this.currentTimetable = null;
    this.generator = new TimetableGenerator();
    this.init();
  }

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      if (!authManager.hasPermission('admin')) {
        window.location.href = 'index.html';
        return;
      }
      
      this.initializeEventListeners();
      this.loadSampleData();
      this.setupAdminSections();
    });
  }

  setupAdminSections() {
    const sections = document.querySelectorAll('.content-section');
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const targetSection = e.target.getAttribute('onclick').match(/'([^']+)'/)[1];
        this.showSection(targetSection);
        
        // Update active states
        menuItems.forEach(mi => mi.classList.remove('active'));
        e.target.classList.add('active');
      });
    });
  }

  showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
      section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
  }

  initializeEventListeners() {
    const $ = id => document.getElementById(id);
    
    $("loadSample").addEventListener('click', () => this.loadSampleData());
    $("loadJson").addEventListener('click', () => this.loadJsonData());
    $("generate").addEventListener('click', () => this.generateTimetable());
    $("exportJson").addEventListener('click', () => this.exportTimetable());
    $("saveToFirestore").addEventListener('click', () => this.saveToFirestore());
    $("publishTimetable").addEventListener('click', () => this.publishTimetable());
  }

  loadSampleData() {
    this.data = this.generator.parseFromStructure();
    this.updateJsonInput();
    this.updateStatus("Sample data loaded successfully", "success");
  }

  loadJsonData() {
    try {
      const jsonInput = document.getElementById("jsonInput").value;
      const parsedData = JSON.parse(jsonInput);
      
      if (!parsedData.timeslots || !parsedData.courses) {
        throw new Error("Missing required fields: timeslots, courses");
      }
      
      this.data = parsedData;
      this.updateStatus("JSON data loaded successfully", "success");
    } catch (error) {
      this.updateStatus("Invalid JSON: " + error.message, "error");
    }
  }

  updateJsonInput() {
    document.getElementById("jsonInput").value = JSON.stringify(this.data, null, 2);
  }

  async generateTimetable() {
    this.updateStatus("Generating optimal timetable...", "info");
    
    const iterations = parseInt(document.getElementById("iterations").value) || 300;
    const conflictWeight = parseInt(document.getElementById("conflictWeight").value) || 500;
    const capacityWeight = parseInt(document.getElementById("capacityWeight").value) || 200;
    
    try {
      // Use genetic algorithm for better results
      const solution = this.generator.geneticAlgorithm(50, Math.floor(iterations / 50));
      
      this.currentTimetable = {
        assignments: solution,
        generatedAt: new Date().toISOString(),
        score: this.generator.calculateFitness(solution),
        metadata: {
          iterations,
          conflictWeight,
          capacityWeight
        }
      };
      
      this.renderTimetable(this.data, solution);
      this.updateStatus(`Timetable generated successfully! Score: ${this.currentTimetable.score}`, "success");
      
    } catch (error) {
      this.updateStatus("Error generating timetable: " + error.message, "error");
    }
  }

  renderTimetable(data, assignments) {
    const container = document.getElementById("timetable");
    container.innerHTML = "";
    
    const timeslotMap = new Map();
    data.timeslots.forEach((_, idx) => timeslotMap.set(idx, []));
    timeslotMap.set("unassigned", []);
    
    data.courses.forEach((course, i) => {
      const assignment = assignments.find(a => a.courseId === course.id) || assignments[i];
      if (!assignment || assignment.timeslotIndex === -1) {
        timeslotMap.get("unassigned").push({ course, room: assignment?.roomId || "N/A" });
      } else {
        timeslotMap.get(assignment.timeslotIndex).push({ 
          course, 
          room: assignment.roomId 
        });
      }
    });
    
    const grid = document.createElement("div");
    grid.className = "admin-timetable-grid";
    
    for (let [timeslotIndex, courses] of timeslotMap) {
      if (courses.length === 0 && timeslotIndex !== "unassigned") continue;
      
      const slotDiv = document.createElement("div");
      slotDiv.className = "admin-slot-card";
      
      const title = document.createElement("div");
      title.className = "slot-header";
      title.innerHTML = `<strong>${
        timeslotIndex === "unassigned" 
          ? "❌ Unassigned Courses" 
          : `🕒 ${data.timeslots[timeslotIndex]}`
      }</strong>`;
      slotDiv.appendChild(title);
      
      if (courses.length === 0) {
        const emptyMsg = document.createElement("div");
        emptyMsg.className = "empty-slot";
        emptyMsg.textContent = "No classes scheduled";
        slotDiv.appendChild(emptyMsg);
      } else {
        courses.forEach(item => {
          const courseDiv = document.createElement("div");
          courseDiv.className = `course-assignment ${item.course.type.toLowerCase()}`;
          
          courseDiv.innerHTML = `
            <div class="course-header">
              <span class="course-code">${item.course.code}</span>
              <span class="course-type">${item.course.type}</span>
            </div>
            <div class="course-name">${item.course.name}</div>
            <div class="assignment-details">
              <span class="teacher">👨‍🏫 ${this.getTeacherName(item.course.teacher)}</span>
              <span class="room">🏫 ${this.getRoomName(item.room)}</span>
              <span class="groups">👥 ${item.course.studentGroups.join(', ')}</span>
            </div>
          `;
          
          slotDiv.appendChild(courseDiv);
        });
      }
      
      grid.appendChild(slotDiv);
    }
    
    container.appendChild(grid);
  }

  getTeacherName(teacherId) {
    const teacher = this.data.teachers.find(t => t.id === teacherId);
    return teacher ? teacher.name : teacherId;
  }

  getRoomName(roomId) {
    const room = this.data.rooms.find(r => r.id === roomId);
    return room ? room.name : roomId;
  }

  updateStatus(message, type = "info") {
    const statusElement = document.getElementById("status");
    statusElement.textContent = message;
    statusElement.className = type;
  }

  exportTimetable() {
    if (!this.currentTimetable) {
      this.updateStatus("No timetable to export", "error");
      return;
    }
    
    const exportData = {
      timetable: this.currentTimetable,
      data: this.data,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: "application/json" 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timetable-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.updateStatus("Timetable exported successfully!", "success");
  }

  async saveToFirestore() {
    if (!this.currentTimetable) {
      this.updateStatus("No timetable to save", "error");
      return;
    }
    
    try {
      this.updateStatus("Saving to database...", "info");
      
      const timetableData = {
        ...this.currentTimetable,
        data: this.data,
        createdBy: authManager.getCurrentUser()?.email || 'admin',
        createdAt: new Date().toISOString(),
        status: 'draft'
      };
      
      const docRef = await addDoc(collection(db, "timetables"), timetableData);
      
      this.updateStatus(`Timetable saved successfully! Document ID: ${docRef.id}`, "success");
      
    } catch (error) {
      this.updateStatus("Error saving to database: " + error.message, "error");
    }
  }

  async publishTimetable() {
    if (!this.currentTimetable) {
      this.updateStatus("No timetable to publish", "error");
      return;
    }
    
    try {
      this.updateStatus("Publishing timetable...", "info");
      
      // Update status to published
      this.currentTimetable.status = 'published';
      this.currentTimetable.publishedAt = new Date().toISOString();
      
      // Save to published collection
      const docRef = await addDoc(collection(db, "published_timetables"), {
        ...this.currentTimetable,
        publishedBy: authManager.getCurrentUser()?.email || 'admin'
      });
      
      this.updateStatus(`Timetable published successfully! Students and faculty can now view it.`, "success");
      
    } catch (error) {
      this.updateStatus("Error publishing timetable: " + error.message, "error");
    }
  }
}

// Initialize admin manager
const adminManager = new AdminTimetableManager();

// Export for global access
window.adminManager = adminManager;