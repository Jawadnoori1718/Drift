package com.drift.api.db;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ObservationRepository extends JpaRepository<Observation, Long> {

    long countByMetricId(Long metricId);

    @Query("""
        SELECT o FROM Observation o
        WHERE o.countryId = :countryId AND o.metricId = :metricId
        ORDER BY o.year ASC
        """)
    List<Observation> findHistory(@Param("countryId") Long countryId,
                                  @Param("metricId") Long metricId);
}
