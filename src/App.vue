<template>
  <div class="mood-journal-app">
    <div class="mood-journal-app-content">
      <div class="app-container">
        <div class="mood-journal-app-content-header">
          <div
            :class="['tab-item', activeIndex === index ? 'active-item' : '']"
            v-for="(item, index) in tabList"
            :key="index"
            @click="handleClick(index)"
          >
            {{ item.name }}
          </div>
        </div>

        <div class="mood-journal-app-content-content">
          <keep-alive>
            <component :is="currentComponent" :journalList="journalList" />
          </keep-alive>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Journal from './views/Journal';

import { db } from './firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot, // <-- real-time listener
} from 'firebase/firestore';

export default {
  components: { Journal },
  data() {
    return {
      journalList: [],
      tabList: [
        { name: 'Journal Entries', componentName: 'journal' }
      ],
      activeIndex: 0,
      currentComponent: 'journal',
      _unsubJournals: null, // <- store unsubscribe
    };
  },
  created() {
    this.startJournalStream();
  },
  beforeUnmount() {
    this.stopJournalStream();
  },
  methods: {
    handleClick(index) {
      this.activeIndex = index;
      this.currentComponent = this.tabList[index].componentName;
    },

    // ----- Real-time stream -----
    startJournalStream() {
      // Order by timestamp descending; stream updates in real time
      const q = query(
        collection(db, 'journalList'),
        orderBy('timestamp', 'desc')
      );

      // If you want to hide local pending writes in RA, set includeMetadataChanges:true
      this._unsubJournals = onSnapshot(
        q,
        (snapshot) => {
          // Optionally ignore local pending writes:
          // const docs = snapshot.docs.filter(d => !d.metadata.hasPendingWrites);
          const docs = snapshot.docs;

          this.journalList = docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            sdImage: doc.data().sdImage || ''
          }));
        },
        (err) => {
          console.error('RA journal stream error:', err);
          this.journalList = [];
        }
      );
    },

    stopJournalStream() {
      if (this._unsubJournals) {
        this._unsubJournals();
        this._unsubJournals = null;
      }
    },
  },
};
</script>

<style lang="less" scoped>
.mood-journal-app {
  height: 100%;
  background: #fff;
  display: flex;
  justify-content: center;

  &-content {
    width: 80%;
    background: #f3f4f6;
    height: 100%;
    padding: 20px;
    display: flex;
    flex-direction: column;

    .app-container {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    &-header {
      flex: none;
      display: flex;
      align-items: center;
      justify-content: flex-start;

      .tab-item {
        padding: 4px 20px;
        border-radius: 12px;
        transition: font-size 0.1s ease;
        cursor: pointer;
      }

      .active-item {
        font-size: 18px;
        font-weight: bold;
        color: green;
        background-color: #99CC99;
      }
    }

    &-content {
      flex: auto;
      overflow: hidden;
      margin-top: 20px;
    }
  }
}
</style>
